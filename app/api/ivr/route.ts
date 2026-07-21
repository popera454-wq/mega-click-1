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

    // ימות המשיח שולחת את הפרמטרים
    const phone = searchParams.get('ApiPhone') || 'Unknown';
    const pin = searchParams.get('pin');
    const answer = searchParams.get('answer');

    const playerId = `phone_${phone.slice(-4)}`;

    // --- שלב 1: עוד לא הוקש PIN ---
    if (!pin) {
      // read=t-הודעה=שם_משתנה,אישור(no),מקס',מין',זמן,סוג
      const responseText = 'read=t-אנא הקש את קוד המשחק בן 6 הספרות=pin,no,6,6,7,Digits,no,no,no,';
      return new Response(responseText, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // --- שלב 2: הוקש PIN ועוד לא הוקשה תשובה ---
    if (pin && !answer) {
      // עדכון השרת בלייב על הצטרפות השחקן
      try {
        const channel = supabase.channel(`game_${pin}`);
        await channel.send({
          type: 'broadcast',
          event: 'PLAYER_JOINED',
          payload: { id: playerId, name: `טלפון ${phone.slice(-4)}`, score: 0 },
        });
      } catch (e) {
        console.error('Supabase broadcast error:', e);
      }

      const responseText = 'read=t-התחברת בהצלחה! כשתופיע שאלה הקש 1 2 3 או 4=answer,no,1,1,15,Digits,no,no,no,1234';
      return new Response(responseText, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // --- שלב 3: הוקשה תשובה (1-4) ---
    if (pin && answer) {
      const answerIndex = parseInt(answer, 10) - 1;

      try {
        const channel = supabase.channel(`game_${pin}`);
        await channel.send({
          type: 'broadcast',
          event: 'SUBMIT_ANSWER',
          payload: { playerId, answerIndex, score: 10, timeTaken: 3 },
        });
      } catch (e) {
        console.error('Supabase broadcast error:', e);
      }

      const responseText = 'read=t-תשובתך נקלטה! לשאלה הבאה הקש 1 2 3 או 4=answer,no,1,1,15,Digits,no,no,no,1234';
      return new Response(responseText, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    return new Response('hangup=yes', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error) {
    console.error('IVR Error:', error);
    return new Response('id_list_message=t-אירעה שגיאה במערכת&hangup=yes', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
