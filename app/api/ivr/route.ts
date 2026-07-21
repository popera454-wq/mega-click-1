import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  return handleYemot(req);
}

export async function POST(req: Request) {
  return handleYemot(req);
}

async function handleYemot(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const phone = searchParams.get('ApiPhone') || 'Unknown';
    // ימות המשיח מעבירה את הערכים לפעמים באותיות קטנות ולפעמים בפרמטרים של ה-read
    const pin = searchParams.get('pin') || searchParams.get('val_name_pin');
    const answer = searchParams.get('answer') || searchParams.get('val_name_answer');
    const joined = searchParams.get('joined');
    const scoreParam = searchParams.get('score');

    let currentScore = scoreParam ? parseInt(scoreParam, 10) : 0;
    const playerId = `phone_${phone.slice(-4)}`;

    // --- שלב 1: עוד לא הוקש PIN ---
    if (!pin) {
      // no,6,6,7,Digits,no,no,no -> ה-"no" האחרונים מבטלים לחלוטין את ה"לאישור הקש 1"!
      return new Response('read=t-אנא הקש את קוד המשחק בן 6 הספרות=pin,no,6,6,7,Digits,no,no,no,', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const channel = supabase.channel(`game_${pin}`);

    // --- שלב 2: הוקש PIN והמשתמש נרשם עכשיו למשחק ---
    if (pin && !answer && !joined) {
      // רישום המשתתף ב-Supabase בבלייב
      await channel.send({
        type: 'broadcast',
        event: 'PLAYER_JOINED',
        payload: {
          id: playerId,
          name: `טלפון ${phone.slice(-4)}`,
          score: 0,
        },
      });

      // משמיע הודעת התחברות ועובר מיד לקליטת תשובה 1-4 בלבד
      return new Response(`read=t-התחברת בהצלחה! כשתופיע שאלה הקש 1 2 3 או 4 לתשובה=answer,no,1,1,15,Digits,no,no,no,1234&joined=1&pin=${pin}&score=0`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // --- שלב 3: הוקשה תשובה לשאלה ---
    if (pin && answer) {
      const answerIndex = parseInt(answer, 10) - 1;
      currentScore += 10;

      // שליחת התשובה והניקוד המעודכן לשרת
      await channel.send({
        type: 'broadcast',
        event: 'SUBMIT_ANSWER',
        payload: {
          playerId,
          answerIndex,
          score: currentScore,
          timeTaken: 3,
        },
      });

      // משמיע שהתשובה נקלטה ומחזיר לבלולאה לשאלה הבאה (ללא אישורים נוספים!)
      return new Response(`read=t-תשובתך נקלטה. לשאלה הבאה הקש 1 2 3 או 4=answer,no,1,1,15,Digits,no,no,no,1234&joined=1&pin=${pin}&score=${currentScore}`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    return new Response('hangup=yes', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error) {
    return new Response('hangup=yes', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
