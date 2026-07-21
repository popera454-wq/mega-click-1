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

    // ימות המשיח שולחת את הנתונים האלו בכל פנייה
    const phone = searchParams.get('ApiPhone') || 'Unknown';
    const pin = searchParams.get('pin');
    const answer = searchParams.get('answer');

    // שלב 1: הלקוח רק נכנס, עדיין אין לו PIN
    if (!pin) {
      // ההוראה לימות המשיח: להשמיע קובץ 1000 ולקלוט 6 ספרות
      // פורמט הפקודה: read=file=var_name,replay,max,min,timeout,allowed_keys
      return new Response('read=f-001=pin,no,6,6,7,', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // שלב 2: הלקוח הקיש PIN, אבל עדיין אין לו תשובה
    if (pin && !answer) {
      // ההוראה לימות המשיח: להשמיע קובץ 1001 ולקלוט 1 ספרה (רק 1,2,3,4 מותרים)
      return new Response('read=f-000=answer,no,1,1,7,1234', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // שלב 3: יש לנו את שני הנתונים! מזרימים למשחק.
    if (pin && answer) {
      const answerIndex = parseInt(answer, 10) - 1;

      const channel = supabase.channel(`game_${pin}`);
      await channel.send({
        type: 'broadcast',
        event: 'SUBMIT_ANSWER',
        payload: {
          playerId: `phone_${phone.slice(-4)}`,
          answerIndex,
          timeTaken: 5,
        },
      });

      // ההוראה לימות המשיח: השמע קובץ 1002 (תודה) ונתק את השיחה.
      return new Response('id_list_message=f-1002&hangup=yes', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // ברירת מחדל למקרה שמשהו השתבש
    return new Response('hangup=yes', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error) {
    return new Response('hangup=yes', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
