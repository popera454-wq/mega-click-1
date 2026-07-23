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
  // 1. קליטת PIN ראשונית (6 ספרות)
  // -------------------------------------------------------------
  if (!pin) {
    return new Response(
      `read=t-הקש קוד משחק=pin,tap,6,6,10,Digits,no,no,no`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // -------------------------------------------------------------
  // 2. כניסה לשלט אילם (מיד לאחר התחברות)
  // -------------------------------------------------------------
  if (pin && !answer) {
    await supabase.from('game_players').upsert({
      game_pin: pin,
      player_name: `טלפון ${phone.slice(-4)}`,
      phone: phone,
    });

    return new Response(
      `read=t-א=answer,tap,1,1,3600,Digits,no,no,no&pin=${pin}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // -------------------------------------------------------------
  // 3. קליטת תשובה (1-4) + חישוב זמן אמת
  // -------------------------------------------------------------
  if (pin && answer) {
    const now = Date.now();
    const answerIndex = Number(answer) - 1; // המרה מ-1..4 ל-0..3

    // א. שליפת זמן פתיחת השאלה מ-Supabase
    const { data: activeGame } = await supabase
      .from('games')
      .select('current_question_index, updated_at')
      .eq('pin', pin)
      .maybeSingle();

    const currentQuestionIndex = activeGame?.current_question_index ?? 0;
    
    // ב. חישוב זמן מענה דינמי בשניות (לדוגמה 1.35 שניות)
    let timeTaken = 1.0;
    if (activeGame?.updated_at) {
      const questionStartTime = new Date(activeGame.updated_at).getTime();
      const diffInSeconds = (now - questionStartTime) / 1000;
      
      // מקבלים את הזמן האמיתי שחלף מרגע פתיחת השאלה
      if (diffInSeconds > 0) {
        timeTaken = Number(diffInSeconds.toFixed(2));
      }
    }

    // ג. שמירה ב-DB
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

    // ד. שידור בזמן אמת ללוח המנחה
    const channel = supabase.channel(`game_${pin}`);
    await channel.send({
      type: 'broadcast',
      event: 'SUBMIT_ANSWER',
      payload: {
        playerId: phone,
        answerIndex: answerIndex,
        timeTaken: timeTaken, // שולח את הזמן המדויק שנמדד!
      },
    });

    // ה. חזרה מיידית לשלט אילם לקליטה הבאה
    return new Response(
      `read=t-א=answer,tap,1,1,3600,Digits,no,no,no&pin=${pin}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  return NextResponse.json({ status: 'ok' });
}
