import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Webhook עבור מערכת טלפונית (תומך ב-Twilio / ימות המשיח)
 * המערכת מקבלת את מקשי המשתמש (Digits / DTMF) ומזרימה אותם לחיבור ה-Realtime של המנחה.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pin, callerPhone, digitPressed, timeTaken } = body;

    if (!pin || !digitPressed) {
      return NextResponse.json(
        { success: false, message: 'חסרים נתונים' },
        { status: 400 }
      );
    }

    // מיפוי מקש 1-4 למפתח תשובה 0-3
    const answerIndex = parseInt(digitPressed, 10) - 1;

    if (answerIndex < 0 || answerIndex > 3) {
      return NextResponse.json(
        { success: false, message: 'מקש לא תקין' },
        { status: 400 }
      );
    }

    // שליחת התשובה הטלפונית ישירות לערוץ המשחק ב-Realtime של Supabase
    const channel = supabase.channel(`game_${pin}`);

    await channel.send({
      type: 'broadcast',
      event: 'SUBMIT_ANSWER',
      payload: {
        playerId: `phone_${
          callerPhone || Math.random().toString().slice(2, 6)
        }`,
        answerIndex,
        timeTaken: timeTaken || 5,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'תשובה טלפונית התקבלה ועודכנה בלייב',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
