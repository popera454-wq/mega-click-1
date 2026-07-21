import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  return handleYemotRequest(req);
}

export async function POST(req: Request) {
  return handleYemotRequest(req);
}

async function handleYemotRequest(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // ימות המשיח שולחת את הפרמטרים בפרמטרים הבאים:
    const phone = searchParams.get('ApiPhone') || 'phone_user';
    const pin = searchParams.get('pin');
    const answer = searchParams.get('answer');

    if (!pin || !answer) {
      // אם חסרים נתונים - מחזירים הוראה לימות המשיח להקריא הודעת שגיאה
      return new Response('id_list_message=t-חסרים נתונים, אנא נסה שנית', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // המרת מקש 1-4 למפתח תשובה 0-3
    const answerIndex = parseInt(answer, 10) - 1;

    // שידור ב-Realtime ללוח המנחה
    const channel = supabase.channel(`game_${pin}`);

    await channel.send({
      type: 'broadcast',
      event: 'SUBMIT_ANSWER',
      payload: {
        playerId: `phone_${phone.slice(-4)}`,
        answerIndex,
        timeTaken: 5,
      },
    });

    // תשובה חיובית לימות המשיח (הקראת טקסט או השמעת הודעה)
    return new Response('id_list_message=t-תשובתך נקלטה בהצלחה', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (err) {
    return new Response('id_list_message=t-אירעה שגיאה בשרת', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
