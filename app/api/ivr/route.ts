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

  // --- 1. שלב התחברות (קליטת PIN) ---
  if (action === 'JOIN') {
    if (!pin) {
      return new Response(
        `read=t-ברוכים הבאים למגה קליק! אנא הקישו את קוד המשחק=pin,tap,6,6,10,Number,no,no,no`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // שמירת השחקן
    await supabase.from('game_players').upsert({
      game_pin: pin,
      player_name: `טלפון ${phone.slice(-4)}`,
      phone: phone,
    });

    // מעבר רציף בלופ פנימי לשלב ANSWER יחד עם ה-PIN
    return new Response(
      `id_list_message=t-נכנסתם בהצלחה! השאירו את הטלפון פתוח כשלט.&read=f-bgmusic=answer,tap,1,1,180,Number,no,no,no&pin=${pin}&action=ANSWER`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // --- 2. שלב השלט האילם (ANSWER) ---
  if (action === 'ANSWER') {
    if (!answer) {
      return new Response(`read=f-bgmusic=answer,tap,1,1,180,Number,no,no,no&pin=${pin}&action=ANSWER`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const now = Date.now();
    const answerIndex = Number(answer) - 1; // 1->0, 2->1

    // מציאת השאלה האקטיבית וחישוב זמן
    const { data: activeGame } = await supabase
      .from('games')
      .select('current_question_index, updated_at')
      .eq('pin', pin)
      .single();

    const currentQuestionIndex = activeGame?.current_question_index ?? 0;
    const questionStartTime = activeGame?.updated_at ? new Date(activeGame.updated_at).getTime() : now;
    const timeTaken = Math.max(0, Number(((now - questionStartTime) / 1000).toFixed(2)));

    // עדכון ב-DB
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

    // שידור למסך המנחה ב-Realtime
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
     * השרשור המושלם:
     * משמיע ביפ (f-ping) -> חוזר מיד למוזיקה -> שומר על ה-pin וה-action בשרשור הבא!
     */
    return new Response(
      `id_list_message=f-ping&read=f-bgmusic=answer,tap,1,1,180,Number,no,no,no&pin=${pin}&action=ANSWER`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  return NextResponse.json({ status: 'ok' });
}
