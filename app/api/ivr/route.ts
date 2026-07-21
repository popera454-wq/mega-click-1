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
    
    // ימות המשיח לפעמים שולחת את המשתנה בתוך val_name_XXX או כמשתנה חופשי
    const pin = searchParams.get('pin') || searchParams.get('val_name_pin');
    const answer = searchParams.get('answer') || searchParams.get('val_name_answer');
    const joined = searchParams.get('joined');
    const scoreParam = searchParams.get('score');

    let currentScore = scoreParam ? parseInt(scoreParam, 10) : 0;
    const playerId = `phone_${phone.slice(-4)}`;

    // --- שלב 1: עוד לא התקבל PIN ---
    if (!pin) {
      // הפורמט המלא של read בימות המשיח:
      // read=t-טקסט=שם_משתנה,confirm(no/yes),max,min,timeout,Digits,tap_digits_no_confirm,tap_digits_no_confirm_message
      return new Response('read=t-אנא הקש את קוד המשחק בן 6 הספרות=pin,no,6,6,7,Digits,no,yes,', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // --- שלב 2: התקבל PIN, השחקן נרשם עכשיו ב-Supabase ---
    if (pin && !answer && !joined) {
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

      // מעבירים לקליטת תשובה 1-4, ושומרים את ה-PIN וה-joined להמשך השיחה
      return new Response(`read=t-התחברת בהצלחה. כשתופיע שאלה הקש 1 2 3 או 4 לתשובה=answer,no,1,1,15,Digits,no,yes,1234&pin=${pin}&joined=1&score=0`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // --- שלב 3: התקבלה תשובה (1-4) ---
    if (pin && answer) {
      const answerIndex = parseInt(answer, 10) - 1;
      currentScore += 10;

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

      // משמיע שהתשובה נקלטה וממשיך לחכות לתשובה הבאה (ללא ניתוק!)
      return new Response(`read=t-תשובתך נקלטה. לשאלה הבאה הקש 1 2 3 או 4=answer,no,1,1,15,Digits,no,yes,1234&pin=${pin}&joined=1&score=${currentScore}`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // ברירת מחדל למקרה שאין ניתוק מפורש
    return new Response(`read=t-אנא הקש תשובה=answer,no,1,1,15,Digits,no,yes,1234&pin=${pin}&joined=1`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error) {
    return new Response('id_list_message=t-אירעה שגיאה&hangup=yes', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
