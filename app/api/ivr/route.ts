// פקודות קריטיות ל-Next.js - חובה כדי למנוע ניתוקים של ימות המשיח!
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
// מריץ את השרת על שרתי הקצה של Vercel לתגובה של אלפיות שנייה (מונע Timeouts)
export const runtime = 'edge'; 

import { supabase } from "@/lib/supabase";

/**
 * פונקציה לייצור תגובה תקנית לימות המשיח
 * מחזירה טקסט נקי עם כותרות שמונעות לחלוטין Caching
 */
function buildIvrResponse(textCommand: string): Response {
  return new Response(textCommand.trim(), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}

// הודעות מובנות
function promptForPin(msg = "שלום וברוכים הבאים למערכת הטריוויה. הקש את קוד המשחק בן שש הספרות") {
  return buildIvrResponse(`read=t-${msg}=q_pin,no,6,6,10,Digits,no,no,`);
}

function promptForAnswer(msg = "הקש את מספר התשובה בין אחת לארבע") {
  return buildIvrResponse(`read=t-${msg}=q_ans,no,1,1,15,Digits,no,no,`);
}

/**
 * חילוץ פרמטרים עמיד מ-GET ו-POST
 */
async function parseParams(req: Request) {
  const params: Record<string, string> = {};
  try {
    const url = new URL(req.url);
    url.searchParams.forEach((val, key) => { params[key] = val; });

    if (req.method === "POST") {
      const text = await req.text();
      if (text) {
        const bodyParams = new URLSearchParams(text);
        bodyParams.forEach((val, key) => { params[key] = val; });
      }
    }
  } catch (err) {
    console.error("[IVR PARSE ERROR]:", err);
  }
  return params;
}

export async function GET(req: Request) { return handleIVR(req); }
export async function POST(req: Request) { return handleIVR(req); }

async function handleIVR(req: Request) {
  try {
    const params = await parseParams(req);
    const phone = params.ApiPhone || params.phone || params.ApiPhoneFrom || "";
    
    if (!phone) return promptForPin();

    const inputPin = params.q_pin || params.val_name_q_pin || params.pin || "";
    const inputAns = params.q_ans || params.val_name_q_ans || params.answer || "";

    // תרחיש 1: התקבל PIN
    if (inputPin) {
      if (!/^\d{6}$/.test(inputPin)) return promptForPin("קוד המשחק אינו תקין. הקש קוד בן שש ספרות בלבד");

      // נריץ את השמירות במקביל (Promise.all) כדי לחסוך זמן ולמנוע ניתוק
      const playerName = `משתתף ${phone.slice(-4)}`;
      
      await Promise.all([
        supabase.from("ivr_sessions").upsert({ phone, pin: inputPin }, { onConflict: "phone" }),
        supabase.from("game_players").upsert({ game_pin: inputPin, phone, player_name: playerName }, { onConflict: "game_pin,phone" })
      ]);

      // Broadcast רץ ברקע ולא תוקע את הפונקציה
      supabase.channel(`game_${inputPin}`).send({
        type: "broadcast", event: "PLAYER_JOINED", payload: { playerId: phone, name: playerName, score: 0 }
      }).catch(() => {});

      return promptForAnswer("התחברת בהצלחה! כשתופיע שאלה, הקש את מספר התשובה בין אחת לארבע");
    }

    // תרחיש 2: בדיקת סשן קיים ב-Supabase (הלקוח כבר הקליד PIN בעבר)
    const { data: session } = await supabase
      .from("ivr_sessions")
      .select("pin")
      .eq("phone", phone)
      .maybeSingle();

    if (!session?.pin) return promptForPin();
    const activePin = session.pin;

    // תרחיש 3: ממתינים לתשובה
    if (!inputAns) return promptForAnswer();

    // תרחיש 4: התקבלה תשובה
    const numericAns = parseInt(inputAns, 10);
    if (isNaN(numericAns) || numericAns < 1 || numericAns > 4) {
      return promptForAnswer("תשובה לא תקינה. הקש תשובה בין אחת לארבע");
    }

    const answerIndex = numericAns - 1;

    // שמירת תשובה
    await supabase.from("game_answers").insert({
      game_pin: activePin,
      phone,
      answer_index: answerIndex,
    });

    supabase.channel(`game_${activePin}`).send({
      type: "broadcast", event: "SUBMIT_ANSWER", payload: { playerId: phone, answerIndex, score: 0, timeTaken: 0 }
    }).catch(() => {});

    return promptForAnswer("התשובה התקבלה! לשאלה הבאה הקש שוב את מספר התשובה");

  } catch (error) {
    console.error("[IVR FATAL ERROR]:", error);
    // קריטי: תמיד להחזיר משהו לימות המשיח, גם אם יש שגיאה, כדי שלא ינתק
    return promptForPin("מערכת הנתונים עמוסה. אנא הקש שוב את קוד המשחק");
  }
}
