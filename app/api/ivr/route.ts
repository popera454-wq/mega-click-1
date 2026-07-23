// app/api/ivr/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const phone = searchParams.get('ApiPhone') || searchParams.get('phone') || '0000000000';
  const action = searchParams.get('action') || 'JOIN';
  
  // ימות המשיח מעבירה את pin אם הוא הוקש קודם לכן, או שנקבל אותו מה-searchParams
  const pin = searchParams.get('pin');
  const answer = searchParams.get('answer');

  // -------------------------------------------------------------
  // 1. שלב התחברות (קליטת PIN של 6 ספרות)
  // -------------------------------------------------------------
  if (action === 'JOIN') {
    if (!pin) {
      // קליטת 6 ספרות של קוד המשחק. ללא אישורים, קליטה מהירה
      return new Response(
        `read=t-ברוכים הבאים למגה קליק! אנא הקישו את קוד המשחק=pin,tap,6,6,10,Number,no,no,no`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // שמירת השחקן ב-Supabase
    const { error } = await supabase.from('game_players').upsert({
      game_pin: pin,
      player_name: `טלפון ${phone.slice(-4)}`,
      phone: phone,
    });

    if (error) {
      return new Response(`read=t-קוד המשחק שגוי. אנא הקישו שוב=pin,tap,6,6,10,Number,no,no,no`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // מעבר נקי לשלב ה-ANSWER עם הנתיבים המדויקים של הקבצים שלך!
    return new Response(
      `read=t-התחברת בהצלחה.&read=f-ivr2:bgmusic/000=answer,tap,1,1,180,Number,no,no,no`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // -------------------------------------------------------------
  // 2. שלב השלט האילם (קליטת מקש 1-4 בלייב)
  // -------------------------------------------------------------
  if (action === 'ANSWER') {
    // אם לא נלחץ מקש עדיין (או שהגיע בטעות), מפעיל את מנגינת הרקע
    if (!answer) {
      return new Response(
        `read=f-ivr2:bgmusic/000=answer,tap,1,1,180,Number,no,no,no`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    const now = Date.now();
    const answerIndex = Number(answer) - 1; // המרה מ-1,2,3,4 ל-0,1,2,3

    // שליפת השאלה הפעילה ב-Supabase עבור המשחק הזה
    if (pin) {
      const { data: activeGame } = await supabase
        .from('games')
        .select('current_question_index, updated_at')
        .eq('pin', pin)
        .single();

      const currentQuestionIndex = activeGame?.current_question_index ?? 0;
      const questionStartTime = activeGame?.updated_at ? new Date(activeGame.updated_at).getTime() : now;
      const timeTaken = Math.max(0, Number(((now - questionStartTime) / 1000).toFixed(2)));

      // שמירה ב-DB (עדכון תשובה במקרה של שינוי)
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

      // שידור בזמן אמת ללוח המנחה
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

    /**
     * השרשור התקני בימות המשיח:
     * 1. השמעת קובץ הפינג המדויק: f-ivr2:ping/000
     * 2. חזרה מידית למוזיקת הרקע ולקליטת המקש הבא: f-ivr2:bgmusic/000
     */
    return new Response(
      `read=f-ivr2:ping/000=none,tap,0,0,0,Number,no,no,no&read=f-ivr2:bgmusic/000=answer,tap,1,1,180,Number,no,no,no`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  return NextResponse.json({ status: 'ok' });
}
