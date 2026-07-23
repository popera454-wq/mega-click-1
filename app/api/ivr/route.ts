// app/api/ivr/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // נתונים שמגיעים מימות המשיח
  const phone = searchParams.get('ApiPhone') || searchParams.get('phone') || '0000000000';
  const action = searchParams.get('action') || 'JOIN';
  const pin = searchParams.get('pin');
  const answer = searchParams.get('answer');

  // -------------------------------------------------------------
  // 1. הצטרפות למשחק לפי קוד PIN (ללא אישורים וללא עיכובים)
  // -------------------------------------------------------------
  if (action === 'JOIN') {
    if (!pin) {
      // no,no,no בסוף הפרמטרים מבטל לחלוטין את מנגנון האישור וההשמעה החוזרת
      return new Response(
        `read=t-הקש קוד משחק=pin,tap,6,6,10,Number,no,no,no`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // רישום השחקן
    const { error } = await supabase.from('game_players').upsert({
      game_pin: pin,
      player_name: `טלפון ${phone.slice(-4)}`,
      phone: phone,
    });

    if (error) {
      return new Response(`id_list_message=t-קוד שגוי&go_to_folder=/`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // מעבר מיידי לשלוחה 2 (שלוחת המענה) במינימום דיבור
    return new Response(
      `id_list_message=t-מחובר&go_to_folder=/2`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // -------------------------------------------------------------
  // 2. מענה על שאלה - קליטה מיידית + חישוב זמן הלחיצה
  // -------------------------------------------------------------
  if (action === 'ANSWER') {
    if (!pin || !answer) {
      // קליטת מקש 1 בלבד (או מספר לטווח) - קליטה מידית ללא אישור
      return new Response(`read=t-הקש תשובה=answer,tap,5,1,5,Number,no,no,no`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const now = Date.now();

    // א. שליפת השאלה הפעילה וזמן תחילת השאלה מ-Supabase
    const { data: activeGame } = await supabase
      .from('games')
      .select('current_question_index, updated_at')
      .eq('pin', pin)
      .single();

    const currentQuestionIndex = activeGame?.current_question_index ?? 0;
    
    // חישוב זמן הלחיצה בשניות מדויקות (Math.max מונע מספר שלילי)
    const questionStartTime = activeGame?.updated_at ? new Date(activeGame.updated_at).getTime() : now;
    const timeTaken = Math.max(0, Number(((now - questionStartTime) / 1000).toFixed(2)));

    // ב. זיהוי סוג התשובה (אמריקאית 1-4 או מספר טווח)
    const isSingleChoice = answer.length === 1 && Number(answer) >= 1 && Number(answer) <= 4;
    const answerIndex = isSingleChoice ? Number(answer) - 1 : null;

    // ג. שמירה ב-DB (כולל זמן הלחיצה)
    await supabase.from('game_answers').insert({
      game_pin: pin,
      phone: phone,
      answer_index: answerIndex,
      answer_value: isSingleChoice ? null : String(answer),
      question_index: currentQuestionIndex,
    });

    // ד. שידור בלייב ב-Realtime למסך המנחה עם ה-timeTaken המדויק!
    const channel = supabase.channel(`game_${pin}`);
    await channel.send({
      type: 'broadcast',
      event: 'SUBMIT_ANSWER',
      payload: {
        playerId: phone,
        answerIndex: isSingleChoice ? answerIndex : undefined,
        answerValue: isSingleChoice ? undefined : answer,
        timeTaken: timeTaken, // נשלח הזמן המדויק
      },
    });

    // ה. מחזיר צליל קצר/הודעה קצרה ומחזיר אותם מוכנים לשאלה הבאה
    return new Response(`id_list_message=t-נקלט&go_to_folder=/2`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return NextResponse.json({ status: 'ok' });
}
