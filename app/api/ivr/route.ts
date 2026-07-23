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
  // שלב 1: הצטרפות למשחק (קליטת PIN בלבד)
  // -------------------------------------------------------------
  if (!pin) {
    return new Response(
      `read=t-הקש קוד משחק=pin,tap,6,6,10,Number,no,no,no`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // -------------------------------------------------------------
  // שלב 2: שחקן מחובר - שלט אילם בלייב
  // -------------------------------------------------------------

  // אם התקבל PIN חדש עכשיו (בפעם הראשונה אחרי ההקשה)
  if (pin && !answer) {
    // רישום השחקן ב-Supabase
    await supabase.from('game_players').upsert({
      game_pin: pin,
      player_name: `טלפון ${phone.slice(-4)}`,
      phone: phone,
    });

    // כניסה למצב שלט אילם - שקט מוחלט, ממתין להקשת מקש 1-4
    return new Response(
      `read=t- =answer,tap,1,1,3600,Number,no,no,no&pin=${pin}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // אם הוקשה תשובה (1, 2, 3 או 4)
  if (pin && answer) {
    const now = Date.now();
    const answerIndex = Number(answer) - 1; // המרה מ-1..4 ל-0..3

    // שליפת השאלה הפעילה ב-Supabase
    const { data: activeGame } = await supabase
      .from('games')
      .select('current_question_index, updated_at')
      .eq('pin', pin)
      .single();

    const currentQuestionIndex = activeGame?.current_question_index ?? 0;
    const questionStartTime = activeGame?.updated_at ? new Date(activeGame.updated_at).getTime() : now;
    const timeTaken = Math.max(0, Number(((now - questionStartTime) / 1000).toFixed(2)));

    // שמירה/עדכון התשובה ב-DB
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

    // שידור מיידי למסך המנחה ב-Realtime!
    const channel = supabase.channel(`game_${pin}`);
    await channel.send({
      type: 'broadcast',
      event: 'SUBMIT_ANSWER',
      payload: {
        playerId: phone,
        answerIndex: answerIndex,
        timeTaken: timeTaken,
      },
    });

    // חזרה מיידית לשקט מוחלט (מוכן ללחיצה הבאה / לשאלה הבאה)
    return new Response(
      `read=t- =answer,tap,1,1,3600,Number,no,no,no&pin=${pin}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  return NextResponse.json({ status: 'ok' });
}
