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
    const pin = searchParams.get('pin');
    const answer = searchParams.get('answer');
    const scoreParam = searchParams.get('score');

    let currentScore = scoreParam ? parseInt(scoreParam, 10) : 0;
    const playerId = `phone_${phone.slice(-4)}`;

    // --- שלב 1: קליטת PIN (הקראת טקסט ללא קבצים) ---
    if (!pin) {
      // t-... אומר לימות המשיח להקריא את הטקסט המצורף
      return new Response('read=t-אנא הקש את קוד המשחק בן 6 הספרות=pin,no,6,6,7,Digits,no,no,no,', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const channel = supabase.channel(`game_${pin}`);

    // --- שלב 2: הצטרפות ראשונית למשחק ---
    if (pin && !answer && !scoreParam) {
      // רישום השחקן בלייב בשרת
      await channel.send({
        type: 'broadcast',
        event: 'PLAYER_JOINED',
        payload: {
          id: playerId,
          name: `טלפון ${phone.slice(-4)}`,
          score: 0,
        },
      });

      // הקראת הודעת התחברות והנחיה להקיש 1-4
      return new Response(`read=t-התחברת בהצלחה למשחק. כשתופיע שאלה הקש 1 2 3 או 4 לתשובה=answer,no,1,1,15,Digits,no,no,no,1234&score=0`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // --- שלב 3: קליטת תשובה ועדכון ניקוד ---
    if (pin && answer) {
      const answerIndex = parseInt(answer, 10) - 1;
      currentScore += 10;

      // שידור התשובה ללוח המנחה
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

      // הקראת אישור קליטה והמתנה לשאלה הבאה בלולאה
      return new Response(`read=t-תשובתך נקלטה בהצלחה. לשאלה הבאה הקש את תשובתך=answer,no,1,1,15,Digits,no,no,no,1234&score=${currentScore}`, {
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
