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
  const action = searchParams.get('action') || (pin ? 'ANSWER' : 'JOIN');

  // -------------------------------------------------------------
  // 1. שלב התחברות (קליטת PIN)
  // -------------------------------------------------------------
  if (action === 'JOIN' && !pin) {
    return new Response(
      `read=t-ברוכים הבאים למגה קליק! אנא הקישו את קוד המשחק=pin,tap,6,6,10,Number,no,no,no`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // אם התקבל PIN בשלב ההצטרפות
  if (pin && (!answer || action === 'JOIN')) {
    // שמירת השחקן ב-Supabase
    await supabase.from('game_players').upsert({
      game_pin: pin,
      player_name: `טלפון ${phone.slice(-4)}`,
      phone: phone,
    });

    // מחזירים הודעת הצלחה + מעבר מיידי למוזיקה לקליטת תשובות
    return new Response(
      `read=t-התחברת בהצלחה.&read=f-ivr2:bgmusic/000=answer,tap,1,1,180,Number,no,no,no`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // -------------------------------------------------------------
  // 2. שלב השלט האילם (קליטת תשובה 1-4)
  // -------------------------------------------------------------
  if (action === 'ANSWER' || answer) {
    if (answer && pin) {
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

      // שמירה ב-DB
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

      // שידור ללוח המנחה בזמן אמת
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
    }

    // השמעת הביפ + חזרה למוזיקת הרקע לקליטת המקש הבא
    return new Response(
      `read=f-ivr2:ping/000=none,tap,0,0,0,Number,no,no,no&read=f-ivr2:bgmusic/000=answer,tap,1,1,180,Number,no,no,no`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  return NextResponse.json({ status: 'ok' });
}
