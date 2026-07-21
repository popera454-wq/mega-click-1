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
    const joined = searchParams.get('joined');
    const scoreParam = searchParams.get('score');

    let currentScore = scoreParam ? parseInt(scoreParam, 10) : 0;
    const playerId = `phone_${phone.slice(-4)}`;

    // --- שלב 1: עוד לא הוקש PIN ---
    if (!pin) {
      // מקריא: "אנא הקש את קוד המשחק..."
      // הפורמט שומר על קליטה נקייה ללא שום שאלת אישור!
      return new Response('read=t-אנא הקש את קוד המשחק בן 6 הספרות=pin,no,6,6,7,Digits,no,no,no,', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // --- שלב 2: הוקש PIN קודם, והשחקן מחובר עכשיו לראשונה ---
    if (pin && !answer && !joined) {
      // רישום השחקן בבלייב ב-Supabase!
      try {
        const channel = supabase.channel(`game_${pin}`);
        await channel.send({
          type: 'broadcast',
          event: 'PLAYER_JOINED',
          payload: { id: playerId, name: `טלפון ${phone.slice(-4)}`, score: 0 },
        });
      } catch (e) {
        console.error('Supabase Error:', e);
      }

      // משמיע "התחברת בהצלחה" ועובר לקלוט תשובה.
      // שים לב שנוסף בסוף &pin=${pin}&joined=1 – זה מה שמונע את הבלופים!
      return new Response(`read=t-התחברת בהצלחה. כשתופיע שאלה הקש 1 2 3 או 4 לתשובה=answer,no,1,1,15,Digits,no,no,no,1234&pin=${pin}&joined=1&score=0`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // --- שלב 3: הוקשה תשובה (1-4) ---
    if (pin && answer) {
      const answerIndex = parseInt(answer, 10) - 1;
      currentScore += 10;

      // שידור התשובה ב-Realtime ללוח המנחה
      try {
        const channel = supabase.channel(`game_${pin}`);
        await channel.send({
          type: 'broadcast',
          event: 'SUBMIT_ANSWER',
          payload: { playerId, answerIndex, score: currentScore, timeTaken: 3 },
        });
      } catch (e) {
        console.error('Supabase Error:', e);
      }

      // משמיע "תשובתך נקלטה" ומחזיר לקלוט את התשובה לשאלה הבאה (בשרשרת)
      return new Response(`read=t-תשובתך נקלטה. לשאלה הבאה הקש את תשובתך=answer,no,1,1,15,Digits,no,no,no,1234&pin=${pin}&joined=1&score=${currentScore}`, {
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
