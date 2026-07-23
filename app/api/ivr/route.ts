// app/api/ivr/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// חיבור ל-Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // פרמטרים שמגיעים מימות המשיח
  const phone = searchParams.get('ApiPhone') || searchParams.get('phone') || '0000000000';
  const action = searchParams.get('action') || 'JOIN';
  const pin = searchParams.get('pin');
  const answer = searchParams.get('answer');

  // --- שלב 1: הצטרפות למשחק לפי קוד PIN ---
  if (action === 'JOIN') {
    if (!pin) {
      // ימות המשיח: השמעת הודעה ובקשת הקשת PIN (6 ספרות)
      return new Response(
        `read=t-שלום, אנא הקש את קוד המשחק ולאחריו סולמית=pin,6,1,6,7,Number,none`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // בדיקה/הרשמה בטבלת game_players
    const { error } = await supabase.from('game_players').upsert({
      game_pin: pin,
      player_name: `טלפון ${phone.slice(-4)}`, // שם ברירת מחדל לפי 4 ספרות אחרונות
      phone: phone,
    });

    if (error) {
      return new Response(`id_list_message=t-קוד המשחק שגוי או שקיימת תקלה. ברוך הבא.&go_to_folder=/`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // העברה לשלב המענה על שאלות
    return new Response(
      `id_list_message=t-התחברת בהצלחה למשחק! כעת המתן לשאלה והקש את מספר התשובה בשלט&go_to_folder=/2`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // --- שלב 2: מענה על שאלה דרך המקשים ---
  if (action === 'ANSWER') {
    if (!pin || !answer) {
      return new Response(`read=t-הקש את תשובתך=answer,1,1,1,7,Number,none`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const answerIndex = Number(answer) - 1; // המרת הקשה 1-4 לאינדקס 0-3

    // א. מציאת השאלה האקטיבית העדכנית ב-Supabase עבור ה-PIN הזה
    const { data: activeGame } = await supabase
      .from('games')
      .select('current_question_index')
      .eq('pin', pin)
      .single();

    const currentQuestionIndex = activeGame?.current_question_index ?? 0;

    // ב. שמירת התשובה ב-DB
    await supabase.from('game_answers').insert({
      game_pin: pin,
      phone: phone,
      answer_index: answerIndex,
      question_index: currentQuestionIndex,
    });

    // ג. שידור בלייב ב-Realtime למסך המנחה!
    const channel = supabase.channel(`game_${pin}`);
    await channel.send({
      type: 'broadcast',
      event: 'SUBMIT_ANSWER',
      payload: {
        playerId: phone,
        answerIndex: answerIndex,
        timeTaken: 0,
      },
    });

    return new Response(`id_list_message=t-תשובתך נקלטה בהצלחה!`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return NextResponse.json({ status: 'ok' });
}
