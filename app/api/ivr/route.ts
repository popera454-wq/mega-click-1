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
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    // קריאת הפרמטרים מימות המשיח
    const phone = searchParams.get('ApiPhone') || searchParams.get('phone') || '0000';
    const pin = searchParams.get('pin') || searchParams.get('val_name_pin');
    const answer = searchParams.get('answer') || searchParams.get('val_name_answer');

    const playerId = `phone_${phone.slice(-4)}`;

    // ----------------------------------------------------
    // שלב 1: עוד לא הוקש PIN -> מבקשים קוד בן 6 ספרות
    // ----------------------------------------------------
    if (!pin) {
      return new Response(
        'read=t-אנא הקש את קוד המשחק בן 6 הספרות=pin,no,6,6,10,Digits,no,no,',
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // ----------------------------------------------------
    // שלב 2: הוקש PIN ועוד אין תשובה -> לרשום את השחקן בלוח
    // ----------------------------------------------------
    if (pin && !answer) {
      // שליחה ברקע בלבד (ללא await!) כדי שהתגובה לימות המשיח תוחזר מיידית ב-50ms ולא תגרום לניתוק!
      supabase
        .channel(`game_${pin}`)
        .send({
          type: 'broadcast',
          event: 'PLAYER_JOINED',
          payload: { id: playerId, name: `טלפון ${phone.slice(-4)}`, score: 0 },
        })
        .catch((err) => console.error('Supabase async error:', err));

      return new Response(
        'read=t-התחברת בהצלחה. כשתופיע שאלה הקש 1 2 3 או 4 לתשובה=answer,no,1,1,15,Digits,no,no,1234',
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // ----------------------------------------------------
    // שלב 3: הוקשה תשובה (1, 2, 3 או 4) -> לשלוח למנחה
    // ----------------------------------------------------
    if (pin && answer) {
      const answerIndex = parseInt(answer, 10) - 1;

      // שליחה ברקע (ללא await!) למניעת עיכובים וניתוקים
      supabase
        .channel(`game_${pin}`)
        .send({
          type: 'broadcast',
          event: 'SUBMIT_ANSWER',
          payload: { playerId, answerIndex, score: 10, timeTaken: 3 },
        })
        .catch((err) => console.error('Supabase async error:', err));

      return new Response(
        'read=t-תשובתך נקלטה. לשאלה הבאה הקש 1 2 3 או 4=answer,no,1,1,15,Digits,no,no,1234',
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    return new Response(
      'read=t-אנא הקש 1 2 3 או 4 לתשובה=answer,no,1,1,15,Digits,no,no,1234',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );

  } catch (error) {
    console.error('IVR General Error:', error);
    return new Response(
      'read=t-אנא הקש את קוד המשחק בן 6 הספרות=pin,no,6,6,10,Digits,no,no,',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }
}
