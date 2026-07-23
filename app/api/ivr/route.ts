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
  const pin = searchParams.get('pin');
  const answer = searchParams.get('answer');

  // --- 1. שלב התחברות (ללא שינוי, קולט 6 ספרות) ---
  if (action === 'JOIN') {
    if (!pin) {
      // כאן עדיין אפשר להשתמש בדיבור רובוטי כי זה רק פעם אחת בכניסה
      return new Response(
        `read=t-ברוכים הבאים למגה קליק! אנא הקישו את קוד המשחק=pin,tap,6,6,10,Number,no,no,no`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    await supabase.from('game_players').upsert({
      game_pin: pin,
      player_name: `טלפון ${phone.slice(-4)}`,
      phone: phone,
    });

    // כניסה חלקה למשחק עם הודעה קצרה, ואז מעבר לשלוחה 2
    return new Response(
      `id_list_message=t-נכנסתם בהצלחה! השאירו את הטלפון פתוח כשלט.&go_to_folder=/2`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // --- 2. שלב השלט האילם (Pro Clicker Mode) ---
  if (action === 'ANSWER') {
    if (!pin || !answer) {
      /**
       * ה-MAGIC TRICK: 
       * במקום להגיד "אנא הקש", אנחנו מנגנים קובץ שמע (f-bgmusic).
       * הפרמטר '1,1' מבטיח שקולטים *רק* ספרה אחת. ברגע שלוחצים - זה נשלח מיד!
       * 180 = אורך מקסימלי של מוזיקה (3 דקות כל לופ)
       */
      return new Response(`read=f-bgmusic=answer,tap,1,1,180,Number,no,no,no`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const now = Date.now();
    const answerIndex = Number(answer) - 1; // ממיר 1->0, 2->1 וכו'

    // מציאת השאלה האקטיבית (כדי לחשב זמן לחיצה)
    const { data: activeGame } = await supabase
      .from('games')
      .select('current_question_index, updated_at')
      .eq('pin', pin)
      .single();

    const currentQuestionIndex = activeGame?.current_question_index ?? 0;
    const questionStartTime = activeGame?.updated_at ? new Date(activeGame.updated_at).getTime() : now;
    const timeTaken = Math.max(0, Number(((now - questionStartTime) / 1000).toFixed(2)));

    // שמירה ב-DB 
    // בגרסת Pro - שחקן יכול לשנות תשובה אם הוא לוחץ שוב (הלחיצה האחרונה קובעת)
    await supabase.from('game_answers').upsert(
      {
        game_pin: pin,
        phone: phone,
        question_index: currentQuestionIndex,
        answer_index: answerIndex,
        answer_value: null,
      },
      { onConflict: 'game_pin, phone, question_index' } // דורש הגדרת Unique ב-Supabase!
    );

    // שידור למסך
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

    /**
     * אישור לחיצה (Feedback) ללא דיבור:
     * מנגנים קובץ צליל "פיפ" (f-ping)
     * ומיד זורקים אותו חזרה לתחילת הלופ (go_to_folder=/2) שישמע שוב את המוזיקה.
     */
    return new Response(`id_list_message=f-ping&go_to_folder=/2`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return NextResponse.json({ status: 'ok' });
}
