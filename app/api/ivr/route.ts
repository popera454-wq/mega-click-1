import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// פונקציה חזקה לקריאת נתונים מימות המשיח
async function getIncomingData(req: Request) {
  const url = new URL(req.url);
  const data: Record<string, string> = {};
  url.searchParams.forEach((val, key) => (data[key] = val));
  return data;
}

export async function GET(req: Request) { return handleYemotV2(req); }
export async function POST(req: Request) { return handleYemotV2(req); }

async function handleYemotV2(req: Request) {
  try {
    const data = await getIncomingData(req);

    // חילוץ טלפון (קריטי למערכת החדשה)
    const phone = data['ApiPhone'] || data['phone'] || 'Unknown';
    
    // שינוי שמות המשתנים כדי לאתחל את המוח של ימות המשיח
    const inputPin = data['q_pin'] || data['val_name_q_pin'];
    const inputAns = data['q_ans'] || data['val_name_q_ans'];

    // 1. בודקים האם השחקן כבר קיים בטבלה (לפי הטלפון שלו!)
    const { data: existingPlayer } = await supabase
      .from('game_players')
      .select('game_pin')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // הקוד של המשחק הוא או מה שהוא הקליד עכשיו, או מה ששמור לו במסד הנתונים
    const activeGamePin = inputPin || existingPlayer?.game_pin;

    // ----------------------------------------------------
    // מצב 1: משתמש חדש לגמרי, אין לו קוד בטבלה והוא לא הקליד
    // ----------------------------------------------------
    if (!activeGamePin) {
      return new Response(
        'read=t-שלום לך! הגעת למערכת הטריוויה. הקש עכשיו את קוד האירוע בעל שש ספרות=q_pin,no,6,6,10,Digits,no,no,',
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // ----------------------------------------------------
    // מצב 2: משתמש הרגע הקיש קוד PIN (נרשם)
    // ----------------------------------------------------
    if (inputPin) {
      // שומרים את השחקן פיזית בטבלה החדשה!
      await supabase.from('game_players').upsert({
        game_pin: inputPin,
        phone: phone,
        player_name: `משתתף ${phone.slice(-4)}`
      }, { onConflict: 'game_pin,phone' });

      // משדרים למסך (אופציונלי, בשביל הלייב)
      supabase.channel(`game_${inputPin}`).send({
        type: 'broadcast',
        event: 'PLAYER_JOINED',
        payload: { id: `phone_${phone.slice(-4)}`, name: `טלפון ${phone.slice(-4)}`, score: 0 }
      }).catch(() => {});

      return new Response(
        'read=t-נרשמת בהצלחה למשחק! ברגע שהמנחה מציג שאלה, הקש את מספר התשובה שלך=q_ans,no,1,1,15,Digits,no,no,',
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // ----------------------------------------------------
    // מצב 3: משתמש מחובר (יש לו PIN בטבלה) והקיש תשובה
    // ----------------------------------------------------
    if (inputAns && activeGamePin) {
      const numericAns = parseInt(inputAns, 10);

      // שומרים את התשובה פיזית בטבלה!
      await supabase.from('game_answers').insert({
        game_pin: activeGamePin,
        phone: phone,
        answer_index: numericAns - 1
      });

      // משדרים למסך לייב
      supabase.channel(`game_${activeGamePin}`).send({
        type: 'broadcast',
        event: 'SUBMIT_ANSWER',
        payload: { playerId: `phone_${phone.slice(-4)}`, answerIndex: numericAns - 1, score: 10, timeTaken: 3 }
      }).catch(() => {});

      // מחזירים אותו להמתנה לשאלה הבאה
      return new Response(
        'read=t-מצוין, התשובה התקבלה! לשאלה הבאה פשוט הקש שוב את המספר=q_ans,no,1,1,15,Digits,no,no,',
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // ----------------------------------------------------
    // מצב 4: גיבוי נגד ניתוקים - משתמש רשום שנפל בין הכיסאות
    // ----------------------------------------------------
    return new Response(
      'read=t-אנחנו ממתינים לתשובה שלך. הקש ספרה=q_ans,no,1,1,15,Digits,no,no,',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );

  } catch (error) {
    console.error('SERVER ERROR V2:', error);
    // לעולם לא מנתקים!
    return new Response(
      'read=t-הייתה תקלה קטנה. נא להקיש שוב את קוד המשחק=q_pin,no,6,6,10,Digits,no,no,',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }
}
