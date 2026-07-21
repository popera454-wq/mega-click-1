import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const TEXT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
};

/**
 * פונקציה עמידה לקריאת נתונים מכל סוגי הבקשות (GET, POST urlencoded, POST JSON)
 */
async function getIncomingData(req: Request): Promise<Record<string, string>> {
  const data: Record<string, string> = {};

  try {
    // 1. קריאת Query Parameters מה-URL
    const url = new URL(req.url);
    url.searchParams.forEach((value, key) => {
      data[key] = value;
    });

    // 2. קריאת Body במקרה של POST
    if (req.method === "POST") {
      const contentType = req.headers.get("content-type") || "";

      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await req.formData();
        formData.forEach((value, key) => {
          data[key] = String(value);
        });
      } else if (contentType.includes("application/json")) {
        const body = await req.json();
        Object.keys(body).forEach((key) => {
          data[key] = String(body[key]);
        });
      } else {
        // גיבוי לקריאת טקסט חופשי (במידה ונשלח כפורמט שאינו מוצהר ב-Header)
        const rawText = await req.text();
        if (rawText) {
          const params = new URLSearchParams(rawText);
          params.forEach((value, key) => {
            data[key] = value;
          });
        }
      }
    }
  } catch (err) {
    console.error("[IVR READ ERROR]: Failed parsing request", err);
  }

  return data;
}

function ivrResponse(text: string): Response {
  return new Response(text, { headers: TEXT_HEADERS });
}

function askForPin(customMessage?: string) {
  const message = customMessage || "שלום וברוכים הבאים למערכת הטריוויה. הקש כעת את קוד המשחק בן שש הספרות";
  return ivrResponse(`read=t-${message}=q_pin,no,6,6,10,Digits,no,no,`);
}

function askForAnswer(customMessage?: string) {
  const message = customMessage || "ברגע שהמנחה מציג שאלה, הקש את מספר התשובה בין אחת לארבע";
  return ivrResponse(`read=t-${message}=q_ans,no,1,1,15,Digits,no,no,`);
}

/**
 * שליחת אירוע Realtime ללא חסימת השיחה (Async Fire & Forget)
 */
function sendRealtimeEvent(channelName: string, event: string, payload: Record<string, any>) {
  supabase
    .channel(channelName)
    .send({
      type: "broadcast",
      event,
      payload,
    })
    .catch((err) => {
      console.error(`[REALTIME ERROR] Failed sending ${event} to ${channelName}:`, err);
    });
}

export async function GET(req: Request) {
  return handleIVR(req);
}

export async function POST(req: Request) {
  return handleIVR(req);
}

async function handleIVR(req: Request) {
  try {
    const data = await getIncomingData(req);

    console.log("========== IVR REQUEST ==========");
    console.log(data);

    // חילוץ טלפון
    const phone = data.ApiPhone || data.phone || data.ApiPhoneFrom || "";

    if (!phone) {
      console.warn("[IVR WARN]: Missing phone number in request");
      return askForPin();
    }

    // חילוץ פרמטרים של PIN ותשובה
    const inputPin = data.q_pin || data.val_name_q_pin || data.pin || "";
    const inputAnswer = data.q_ans || data.val_name_q_ans || data.answer || "";

    console.log({ phone, inputPin, inputAnswer });

    /**
     * ---------------------------------------------------
     * מצב 1: המשתמש הקיש PIN חדש
     * ---------------------------------------------------
     */
    if (inputPin) {
      if (!/^\d{6}$/.test(inputPin)) {
        console.warn("[IVR WARN]: Illegal PIN format:", inputPin);
        return askForPin("קוד המשחק אינו תקין. הקש קוד בן שש ספרות בלבד");
      }

      console.log("[IVR]: Saving session...");

      // 1. שמירת/עדכון סשן
      const { error: sessionError } = await supabase
        .from("ivr_sessions")
        .upsert(
          { phone, pin: inputPin },
          { onConflict: "phone" }
        );

      if (sessionError) {
        console.error("[IVR ERROR]: Failed to save session:", sessionError);
        return askForPin();
      }

      // 2. רישום השחקן
      const playerName = `משתתף ${phone.slice(-4)}`;
      const { error: playerError } = await supabase
        .from("game_players")
        .upsert(
          {
            game_pin: inputPin,
            phone,
            player_name: playerName,
          },
          { onConflict: "game_pin,phone" }
        );

      if (playerError) {
        console.error("[IVR ERROR]: Failed to save player:", playerError);
      }

      // 3. שידור Realtime למסך המנחה (רץ ברקע ללא await)
      sendRealtimeEvent(`game_${inputPin}`, "PLAYER_JOINED", {
        playerId: phone,
        name: playerName,
        score: 0,
      });

      return askForAnswer("נרשמת בהצלחה! ברגע שהמנחה מציג שאלה, הקש את מספר התשובה בין אחת לארבע");
    }

    /**
     * ---------------------------------------------------
     * מצב 2: אין PIN בבקשה -> שולפים מ-ivr_sessions
     * ---------------------------------------------------
     */
    const { data: session, error: sessionLookupError } = await supabase
      .from("ivr_sessions")
      .select("pin")
      .eq("phone", phone)
      .maybeSingle();

    if (sessionLookupError) {
      console.error("[IVR ERROR]: Failed looking up session:", sessionLookupError);
      return askForPin();
    }

    if (!session?.pin) {
      console.log("[IVR]: No active session found for phone:", phone);
      return askForPin();
    }

    const activeGamePin = session.pin;
    console.log("[IVR]: Active Game PIN:", activeGamePin);

    /**
     * ---------------------------------------------------
     * מצב 3: המשתמש מחובר אך טרם הקיש תשובה
     * ---------------------------------------------------
     */
    if (!inputAnswer) {
      console.log("[IVR]: Waiting for answer...");
      return askForAnswer();
    }

    /**
     * ---------------------------------------------------
     * מצב 4: ולידציה ושמירת תשובה
     * ---------------------------------------------------
     */
    const numericAnswer = Number(inputAnswer);

    if (!Number.isInteger(numericAnswer) || numericAnswer < 1 || numericAnswer > 4) {
      console.warn("[IVR WARN]: Illegal answer:", inputAnswer);
      return askForAnswer("תשובה לא תקינה. נא להקיש תשובה בין אחת לארבע");
    }

    const answerIndex = numericAnswer - 1;

    console.log("[IVR]: Saving answer...", { phone, game: activeGamePin, answerIndex });

    const { error: answerError } = await supabase
      .from("game_answers")
      .insert({
        game_pin: activeGamePin,
        phone,
        answer_index: answerIndex,
      });

    if (answerError) {
      console.error("[IVR ERROR]: Failed saving answer:", answerError);
      return askForAnswer("אירעה תקלה בשמירת התשובה. נסה שוב");
    }

    // שידור התשובה ללוח בלייב (ברקע)
    sendRealtimeEvent(`game_${activeGamePin}`, "SUBMIT_ANSWER", {
      playerId: phone,
      answerIndex,
      score: 0,
      timeTaken: 0,
    });

    return askForAnswer("התשובה התקבלה בהצלחה. לשאלה הבאה הקש שוב את מספר התשובה");

  } catch (error) {
    console.error("========== IVR SERVER CRITICAL ERROR ==========");
    console.error(error);

    return askForPin("אירעה תקלה זמנית. אנא הקש שוב את קוד המשחק");
  }
}
