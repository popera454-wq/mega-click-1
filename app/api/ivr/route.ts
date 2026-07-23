// app/api/ivr/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const phone = searchParams.get('ApiPhone') || searchParams.get('phone') || '0000000000';
  const pin = searchParams.get('pin');
  const answer = searchParams.get('answer');

  // -------------------------------------------------------------
  // 1. קליטת PIN ראשונית (6 ספרות - ללא אישורים!)
  // -------------------------------------------------------------
  if (!pin) {
    return new Response(
      `read=t-הקש קוד משחק=pin,tap,6,6,10,Number,no,no,no`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // -------------------------------------------------------------
  // 2. כניסה ראשונית לשלט האילם (מיד לאחר קליטת ה-PIN)
  // -------------------------------------------------------------
  if (pin && !answer) {
    // רישום השחקן ב-Supabase
    await supabase.from('game_players').upsert({
      game_pin: pin,
      player_name: `טלפון ${phone.slice(-4)}`,
      phone: phone,
    });

    // כניסה לשלט אילם - קליטה מיידית של ספרה 1 ללא אישור (no,no,no)
    return new Response(
      `read=t- =answer,tap,1,1,3600,Number,no,no,no&pin=${pin}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // -------------------------------------------------------------
  // 3. קליטת תשובה (1, 2, 3 או 4) + חישוב זמן שלט אילם
  // -------------------------------------------------------------
  if (pin && answer) {
    const now = Date.now();
    const answerIndex = Number(answer) - 1; // המרה מ-1..4 ל-0..3

    // א. שליפת השאלה הפעילה וזמן פתיחת השאלה
    const { data: activeGame } = await supabase
      .from('games')
      .select('current_question_index, updated_at')
      .eq('pin', pin)
      .single();

    const currentQuestionIndex = activeGame?.current_question_index ?? 0;
    
    // ב. חישוב זמן הלחיצה בשניות (הפרש מאירוע פתיחת השאלה ב-DB)
    const questionStartTime = activeGame?.updated_at 
      ? new Date(activeGame.updated_at).getTime() 
      : now;
      
    // חישוב timeTaken בשניות (לדוגמה 1.34 שניות)
    const timeTaken = Math.max(0.1, Number(((now - questionStartTime) / 1000).toFixed(2)));

    // ג. שמירה ב-DB (הלחיצה המעודכנת נשמרת)
    await supabase.from('game_answers').upsert(
      {
        game_pin: pin,
        phone: phone,
        question_index: currentQuestionIndex,
        answer_index: answerIndex,
        answer_value: null,
      },
      { onConflict: 'game_pin, phone, question_index' }
    );

    // ד. שידור בלייב למסך המנחה כולל הזמן המדויק
    const channel = supabase.channel(`game_${pin}`);
    await channel.send({
      type: 'broadcast',
      event: 'SUBMIT_ANSWER',
      payload: {
        playerId: phone,
        answerIndex: answerIndex,
        timeTaken: timeTaken, // שולח את הזמן המדויק שלקח לו לענות!
      },
    });

    // ה. חזרה מיידית לשלט אילם לקליטת הלחיצה הבאה - ללא שום דיבור או אישור!
    return new Response(
      `read=t- =answer,tap,1,1,3600,Number,no,no,no&pin=${pin}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  return NextResponse.json({ status: 'ok' });
}
