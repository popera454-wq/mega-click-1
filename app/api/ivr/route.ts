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

    // קבלת פרמטרים בסיסיים מימות המשיח
    const phone = searchParams.get('ApiPhone') || searchParams.get('phone') || 'Unknown';
    let pin = searchParams.get('pin') || searchParams.get('val_name_pin');
    const answer = searchParams.get('answer') || searchParams.get('val_name_answer');

    const playerId = `phone_${phone.slice(-4)}`;

    // --- 1. אם הוקש PIN חדש -> נשמור אותו ב-Supabase משודך למספר הטלפון ---
    if (pin) {
      await supabase
        .from('ivr_sessions')
        .upsert({ phone, pin }, { onConflict: 'phone' });
    } else {
      // --- 2. אם לא נשלח PIN -> נשלוף את ה-PIN השמור לפי מספר הטלפון ---
      const { data: session } = await supabase
        .from('ivr_sessions')
        .select('pin')
        .eq('phone', phone)
        .maybeSingle();

      if (session?.pin) {
        pin = session.pin;
      }
    }

    // ----------------------------------------------------
    // מקרה A: עדיין אין PIN (לא בבקשה ולא בבסיס הנתונים)
    // ----------------------------------------------------
    if (!pin) {
      return new Response(
        'read=t- אנא הקש את קוד המשחק בן 6 הספרות ובסיום הקש סולמית=pin,no,6,6,10,Digits,no,no,',
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // ----------------------------------------------------
    // מקרה B: המשתמש מחובר לראשונה (הוקש PIN אך עדיין אין תשובה)
    // ----------------------------------------------------
    if (pin && !answer) {
      // דיווח ללוח המנחה בשרת
      supabase
        .channel(`game_${pin}`)
        .send({
          type: 'broadcast',
          event: 'PLAYER_JOINED',
          payload: { id: playerId, name: `טלפון ${phone.slice(-4)}`, score: 0 },
        })
        .catch((e) => console.error('Supabase broadcast error:', e));

      return new Response(
        'read=t-התחברת בהצלחה. כשתופיע שאלה הקש 1 2 3 או 4 לתשובה=answer,no,1,1,15,Digits,no,no,1234',
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // ----------------------------------------------------
    // מקרה C: הוקשה תשובה (1, 2, 3 או 4)
    // ----------------------------------------------------
    if (pin && answer) {
      const answerIndex = parseInt(answer, 10) - 1;

      // דיווח התשובה ללוח המנחה
      supabase
        .channel(`game_${pin}`)
        .send({
          type: 'broadcast',
          event: 'SUBMIT_ANSWER',
          payload: { playerId, answerIndex, score: 10, timeTaken: 3 },
        })
        .catch((e) => console.error('Supabase broadcast error:', e));

      return new Response(
        'read=t-תשובתך נקלטה. לשאלה הבאה הקש 1 2 3 או 4=answer,no,1,1,15,Digits,no,no,1234',
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    return new Response('hangup=yes', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error) {
    console.error('IVR Critical Error:', error);
    return new Response(
      'read=t-אנא הקש את קוד המשחק בן 6 הספרות=pin,no,6,6,10,Digits,no,no,',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }
}
