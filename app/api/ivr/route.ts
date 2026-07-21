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

    // -----------------------------------------------------------------
    // שלב 1: עדיין לא הוקש PIN
    // -----------------------------------------------------------------
    if (!pin) {
      // no בפרמטר 3 (אישור) ו-no בפרמטר 9 (הקראה מחדש) -> 0 שאלות אישור!
      return new Response(
        'read=t-אנא הקש את קוד המשחק בן 6 הספרות=pin,no,6,6,7,Digits,no,no,',
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // -----------------------------------------------------------------
    // שלב 2: הוקש PIN, השחקן נרשם בלוח
    // -----------------------------------------------------------------
    if (pin && !answer) {
      // שליחה מוגנת ל-Supabase שלא תפיל את השיחה גם אם יש שגיאת רשת
      try {
        const channel = supabase.channel(`game_${pin}`);
        await channel.send({
          type: 'broadcast',
          event: 'PLAYER_JOINED',
          payload: {
            id: playerId,
            name: `טלפון ${phone.slice(-4)}`,
            score: 0,
          },
        });
      } catch (err) {
        console.error('Supabase notification error:', err);
      }

      // מעבר לקליטת תשובה 1-4, עם שמירת ה-PIN בתוך ה-URL להמשך השיחה
      return new Response(
        `read=t-התחברת בהצלחה. כשתופיע שאלה הקש 1 2 3 או 4 לתשובה=answer,no,1,1,15,Digits,no,no,1234&pin=${pin}`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // -----------------------------------------------------------------
    // שלב 3: הוקשה תשובה (1, 2, 3 או 4)
    // -----------------------------------------------------------------
    if (pin && answer) {
      const answerIndex = parseInt(answer, 10) - 1;

      try {
        const channel = supabase.channel(`game_${pin}`);
        await channel.send({
          type: 'broadcast',
          event: 'SUBMIT_ANSWER',
          payload: {
            playerId,
            answerIndex,
            score: 10,
            timeTaken: 3,
          },
        });
      } catch (err) {
        console.error('Supabase notification error:', err);
      }

      return new Response(
        `read=t-תשובתך נקלטה. לשאלה הבאה הקש 1 2 3 או 4=answer,no,1,1,15,Digits,no,no,1234&pin=${pin}`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    return new Response(
      `read=t-אנא הקש 1 2 3 או 4 לתשובה=answer,no,1,1,15,Digits,no,no,1234&pin=${pin}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );

  } catch (error) {
    console.error('Main IVR Error:', error);
    // גם במקרה של שגיאה כללית - לא מנתקים את השיחה!
    return new Response(
      'read=t-אירעה שגיאה. אנא הקש שוב את קוד המשחק=pin,no,6,6,7,Digits,no,no,',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }
}
