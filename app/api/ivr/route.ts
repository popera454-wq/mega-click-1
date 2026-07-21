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

    // --- שלב 1: לקוח נכנס, עדיין לא הקיש PIN ---
    if (!pin) {
      return NextResponse.json({
        values: {
          pin: {
            type: 'read',
            read_type: 'digits',
            min: 6,
            max: 6,
            timeout: 7,
            confirm: false, // מנטרל לחלוטין את "לאישור הקש 1"
            id_list_message: 't-אנא הקש את קוד המשחק בן 6 הספרות'
          }
        }
      });
    }

    const channel = supabase.channel(`game_${pin}`);

    // --- שלב 2: הוקש PIN, השחקן מצטרף למשחק ---
    if (pin && !answer && !scoreParam) {
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

      return NextResponse.json({
        values: {
          answer: {
            type: 'read',
            read_type: 'digits',
            min: 1,
            max: 1,
            timeout: 15,
            confirm: false,
            id_list_message: 't-התחברת בהצלחה! כשתופיע שאלה הקש 1 2 3 או 4 לתשובה'
          }
        },
        // שמירת ה-PIN והניקוד בהמשך השיחה
        params: {
          pin: pin,
          score: '0'
        }
      });
    }

    // --- שלב 3: הוקשה תשובה לשאלה (1-4) ---
    if (pin && answer) {
      const answerIndex = parseInt(answer, 10) - 1;
      currentScore += 10;

      // שידור התשובה לשרת
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

      return NextResponse.json({
        values: {
          answer: {
            type: 'read',
            read_type: 'digits',
            min: 1,
            max: 1,
            timeout: 15,
            confirm: false,
            id_list_message: 't-תשובתך נקלטה. לשאלה הבאה הקש 1 2 3 או 4'
          }
        },
        params: {
          pin: pin,
          score: currentScore.toString()
        }
      });
    }

    return NextResponse.json({ hangup: true });

  } catch (error) {
    return NextResponse.json({ hangup: true });
  }
}
