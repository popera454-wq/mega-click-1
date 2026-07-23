// app/api/ivr/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

  // --- שלב 1: הצטרפות למשחק לפי PIN (קליטת 6 ספרות) ---
  if (action === 'JOIN') {
    if (!pin) {
      /**
       * הסבר על המבנה בימות המשיח:
       * pin = שם המשתנה שיחזור ב-URL
       * tap = מצב הקשת מקשים
       * 6 = מקסימום ספרות (6 ספרות)
       * 6 = מינימום ספרות (6 ספרות)
       * 7 = שניות המתנה
       * Number = סוג קלט (מספר)
       * no = ללא השמעת אישור חוזרת
       */
      return new Response(
        `read=t-שלום, אנא הקש את קוד המשחק בן 6 הספרות=pin,tap,6,6,7,Number,no`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // שמירת השחקן ב-Supabase (מספר הטלפון מזהה אותו)
    const { error } = await supabase.from('game_players').upsert({
      game_pin: pin,
      player_name: `טלפון ${phone.slice(-4)}`,
      phone: phone,
    });

    if (error) {
      return new Response(`id_list_message=t-קוד המשחק שגוי או לא קיים. אנא נסה שוב.&go_to_folder=/`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // מעבר לשלוחה 2 לקבלת תשובות
    return new Response(
      `id_list_message=t-התחברת בהצלחה למשחק! כעת המתן לשאלה והקש את תשובתך&go_to_folder=/2`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // --- שלב 2: מענה על שאלה דרך המקשים ---
  if (action === 'ANSWER') {
    if (!pin || !answer) {
      // תומך גם בתשובה אמריקאית (ספרה 1) וגם בשאלת טווח (עד 5 ספרות)
      return new Response(`read=t-אנא הקש את תשובתך ולאחריה סולמית=answer,tap,5,1,7,Number,no`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // א. מציאת השאלה האקטיבית העדכנית ב-Supabase עבור ה-PIN הזה
    const { data: activeGame } = await supabase
      .from('games')
      .select('current_question_index')
      .eq('pin', pin)
      .single();

    const currentQuestionIndex = activeGame?.current_question_index ?? 0;
    
    // בדיקה אם זו תשובה אמריקאית (ספרות 1-4) או מספר טווח
    const isSingleChoice = answer.length === 1 && Number(answer) >= 1 && Number(answer) <= 4;
    const answerIndex = isSingleChoice ? Number(answer) - 1 : null;

    // ב. שמירת התשובה ב-DB
    await supabase.from('game_answers').insert({
      game_pin: pin,
      phone: phone,
      answer_index: answerIndex,
      answer_value: isSingleChoice ? null : String(answer),
      question_index: currentQuestionIndex,
    });

    // ג. שידור בלייב ב-Realtime למסך המנחה
    const channel = supabase.channel(`game_${pin}`);
    await channel.send({
      type: 'broadcast',
      event: 'SUBMIT_ANSWER',
      payload: {
        playerId: phone,
        answerIndex: isSingleChoice ? answerIndex : undefined,
        answerValue: isSingleChoice ? undefined : answer,
        timeTaken: 0,
      },
    });

    return new Response(`id_list_message=t-תשובתך נקלטה בהצלחה!`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return NextResponse.json({ status: 'ok' });
}
