import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// פונקציית עזר שקוראת פרמטרים גם מ-URL (GET) וגם מגוף הבקשה (POST)
async function getParams(req: Request): Promise<Record<string, string>> {
  const params: Record<string, string> = {};

  // 1. קריאת פרמטרים מכתובת ה-URL
  const url = new URL(req.url);
  url.searchParams.forEach((val, key) => {
    params[key] = val;
  });

  // 2. קריאת פרמטרים מגוף הבקשה (אם נשלח ב-POST מימות המשיח)
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const text = await req.text();
      if (text) {
        // ניסיון קריאה כ-form-urlencoded
        const bodyParams = new URLSearchParams(text);
        bodyParams.forEach((val, key) => {
          params[key] = val;
        });

        // ניסיון קריאה כ-JSON
        if (text.trim().startsWith('{')) {
          const json = JSON.parse(text);
          Object.entries(json).forEach(([k, v]) => {
            params[k] = String(v);
          });
        }
      }
    } catch (e) {
      console.error('Error parsing request body:', e);
    }
  }

  return params;
}

export async function GET(req: Request) {
  return handleYemot(req);
}

export async function POST(req: Request) {
  return handleYemot(req);
}

async function handleYemot(req: Request) {
  try {
    const params = await getParams(req);

    // קבלת המשתנים (ימות המשיח שולחת לפעמים כ-pin ולפעמים כ-val_name_pin)
    const phone = params['ApiPhone'] || params['phone'] || '0000';
    const pin = params['pin'] || params['val_name_pin'];
    const answer = params['answer'] || params['val_name_answer'];
    const playerId = `phone_${phone.slice(-4)}`;

    // ----------------------------------------------------
    // שלב 1: עוד לא הוקש PIN -> מבקשים קוד בן 6 ספרות
    // ----------------------------------------------------
    if (!pin) {
      // no בפרמטר השני מנטרל לחלוטין את "לאישור הקש 1"
      return new Response(
        'read=t-אנא הקש את קוד המשחק בן 6 הספרות=pin,no,6,6,7,Digits,no,yes,',
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    const channel = supabase.channel(`game_${pin}`);

    // ----------------------------------------------------
    // שלב 2: הוקש PIN ועוד אין תשובה -> לרשום את השחקן בלוח!
    // ----------------------------------------------------
    if (pin && !answer) {
      try {
        await channel.send({
          type: 'broadcast',
          event: 'PLAYER_JOINED',
          payload: {
            id: playerId,
            name: `טלפון ${phone.slice(-4)}`,
            score: 0,
          },
        });
      } catch (e) {
        console.error('Supabase broadcast error:', e);
      }

      // משמיע שהתחבר וממתין לתשובה (1-4). הפרמטר &pin= מדביק את הקוד להמשך השיחה!
      return new Response(
        `read=t-התחברת בהצלחה. כשתופיע שאלה הקש 1 2 3 או 4 לתשובה=answer,no,1,1,10,Digits,no,yes,1234&pin=${pin}`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // ----------------------------------------------------
    // שלב 3: הוקשה תשובה (1, 2, 3 או 4) -> לשלוח למנחה!
    // ----------------------------------------------------
    if (pin && answer) {
      const answerIndex = parseInt(answer, 10) - 1;

      try {
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
      } catch (e) {
        console.error('Supabase broadcast error:', e);
      }

      // מאשר שהתשובה נקלטה ומחזיר מיד להמתנה לשאלה הבאה (ללא אישורים וללא ניתוק)
      return new Response(
        `read=t-תשובתך נקלטה. לשאלה הבאה הקש 1 2 3 או 4=answer,no,1,1,10,Digits,no,yes,1234&pin=${pin}`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    return new Response('hangup=yes', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error) {
    console.error('IVR Error:', error);
    return new Response('hangup=yes', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
