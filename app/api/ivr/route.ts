export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { supabase } from "@/lib/supabase";

function buildIvrResponse(textCommand: string): Response {
  return new Response(textCommand.trim(), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function promptForPin(msg = "שלום וברוכים הבאים למערכת הטריוויה. הקש את קוד המשחק בן שש הספרות") {
  return buildIvrResponse(`read=t-${msg}=q_pin,no,6,6,10,Digits,no,no,`);
}

function promptForAnswer(msg = "הקש את מספר התשובה בין אחת לארבע") {
  return buildIvrResponse(`read=t-${msg}=q_ans,no,1,1,15,Digits,no,no,`);
}

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
    
    // אם אין טלפון בבקשה - נבקש PIN מיד
    if (!phone) return promptForPin();

    const inputPin = params.q_pin || params.val_name_q_pin || params.pin || "";
    const inputAns = params.q_ans || params.val_name_q_ans || params.answer || "";

    // -----------------------------------------------------------
    // תרחיש 1: הוקש PIN (רישום שחקן וסשן)
    // -----------------------------------------------------------
    if (inputPin) {
      if (!/^\d{6}$/.test(inputPin)) {
        return promptForPin("קוד המשחק אינו תקין. הקש קוד בן שש ספרות בלבד");
      }

      const playerName = `משתתף ${phone.slice(-4)}`;

      // שמירה ב-Supabase בטוחה בלי לתקוע את הבקשה
      try {
        await supabase.from("ivr_sessions").upsert({ phone, pin: inputPin }, { onConflict: "phone" });
        await supabase.from("game_players").upsert({ game_pin: inputPin, phone, player_name: playerName }, { onConflict: "game_pin,phone" });
      } catch (dbErr) {
        console.error("[DB ERROR]:", dbErr);
      }

      return promptForAnswer("התחברת בהצלחה! כשתופיע שאלה, הקש את מספר התשובה בין אחת לארבע");
    }

    // -----------------------------------------------------------
    // תרחיש 2: בדיקת סשן לפי טלפון
    // -----------------------------------------------------------
    let activePin = "";
    try {
      const { data: session } = await supabase
        .from("ivr_sessions")
        .select("pin")
        .eq("phone", phone)
        .maybeSingle();

      if (session?.pin) activePin = session.pin;
    } catch (dbErr) {
      console.error("[DB SESSION LOOKUP ERROR]:", dbErr);
    }

    if (!activePin) return promptForPin();

    // -----------------------------------------------------------
    // תרחיש 3: המשתמש מחובר אך לא הקיש תשובה
    // -----------------------------------------------------------
    if (!inputAns) return promptForAnswer();

    // -----------------------------------------------------------
    // תרחיש 4: קליטת תשובה
    // -----------------------------------------------------------
    const numericAns = parseInt(inputAns, 10);
    if (isNaN(numericAns) || numericAns < 1 || numericAns > 4) {
      return promptForAnswer("תשובה לא תקינה. הקש תשובה בין אחת לארבע");
    }

    const answerIndex = numericAns - 1;

    try {
      await supabase.from("game_answers").insert({
        game_pin: activePin,
        phone,
        answer_index: answerIndex,
      });
    } catch (dbErr) {
      console.error("[DB ANSWER INSERT ERROR]:", dbErr);
    }

    return promptForAnswer("התשובה התקבלה! לשאלה הבאה הקש שוב את מספר התשובה");

  } catch (error) {
    console.error("[IVR FATAL ERROR]:", error);
    return promptForPin("אירעה שגיאה. הקש שוב את קוד המשחק");
  }
}
