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
  // 1. קליטת PIN (6 ספרות - ללא אישור)
  // -------------------------------------------------------------
  if (!pin) {
    return new Response(
      `read=t-הקש קוד משחק=pin,tap,6,6,10,Number,no,no,no`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // -------------------------------------------------------------
  // 2. כניסה ראשונית לשלט אילם
  // -------------------------------------------------------------
  if (pin && !answer) {
    // רישום השחקן
    await supabase.from('game_players').upsert({
      game_pin: pin,
      player_name: `טלפון ${phone.slice(-4)}`,
      phone: phone,
    });

    return new Response(
      `read=t- =answer,tap,1,1,3600,Number,no,no,no&pin=${pin}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // -------------------------------------------------------------
  // 3. קליטת תשובה + חישוב זמן אמת
  // -------------------------------------------------------------
  if (pin && answer) {
    const now = Date.now();
    const answerIndex = Number(answer) - 1; // המרה מ-1..4 ל-0..3

    // א. שליפת נתוני המשחק הפעיל
    const { data: gameData } = await supabase
      .from('games')
      .select('current_question_index, updated_at, created_at')
      .eq('pin', pin)
      .maybeSingle();

    const currentQuestionIndex = gameData?.current_question_index ?? 0;
    
    // חישוב מתי השאלה התחילה (לפי updated_at או created_at)
    const startTimeStr = gameData?.updated_at || gameData?.created_at;
    const questionStartTime = startTimeStr ? new Date(startTimeStr).getTime() : now - 2000;

    // חישוב שניות שחלפו (לדוגמה: 3.45 שניות)
    let timeTaken = (now - questionStartTime) / 1000;

    // אם התקבל ערך בלתי תקין או שלילי - נותן ברירת מחדל הגיונית לפי זמן הגעת הבקשה
    if (isNaN(timeTaken) || timeTaken <= 0) {
      timeTaken = 2.5; 
    } else {
      timeTaken = Number(timeTaken.toFixed(2));
    }

    // ב. שמירה ב-DB
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

    // ג. שידור בלייב ב-Realtime למסך המנחה
    const channel = supabase.channel(`game_${pin}`);
    await channel.send({
      type: 'broadcast',
      event: 'SUBMIT_ANSWER',
      payload: {
        playerId: phone,
        answerIndex: answerIndex,
        timeTaken: timeTaken, // נשלח הזמן המדויק בשניות!
      },
    });

    // ד. חזרה מיידית לשקט (שלט אילם)
    return new Response(
      `read=t- =answer,tap,1,1,3600,Number,no,no,no&pin=${pin}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  return NextResponse.json({ status: 'ok' });
}
