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
    const action = searchParams.get('action'); // 'join' או 'answer'

    const playerId = `phone_${phone.slice(-4)}`;

    // --- מקרה 1: הצטרפות ראשונית למשחק ---
    if (action === 'join' && pin) {
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

      // מעביר לשלוחה הבאה לקליטת התשובה
      return new Response('id_list_message=t-התחברת בהצלחה למשחק&go_to_folder=/1/1', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // --- מקרה 2: קליטת תשובה לשאלה ---
    if (action === 'answer' && pin && answer) {
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

      return new Response('id_list_message=t-תשובתך נקלטה בהצלחה', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    return new Response('id_list_message=t-קוד משחק לא תקין&hangup=yes', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error) {
    return new Response('hangup=yes', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
