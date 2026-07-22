import { supabase } from "@/lib/supabase";

/**
 * פונקציה ליצירת תגובה תקנית לימות המשיח
 * מונעת ניתוק שיחה ע"י הגדרת Content-Length מפורשת
 */
function buildIvrResponse(textCommand: string): Response {
  const encodedText = textCommand.trim();
  const contentLength = Buffer.byteLength(encodedText, "utf-8");

  return new Response(encodedText, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Length": contentLength.toString(),
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

// הודעה לקליטת PIN (6 ספרות)
function promptForPin(message: string = "שלום וברוכים הבאים למערכת הטריוויה. הקש את קוד המשחק בן שש הספרות") {
  return buildIvrResponse(`read=t-${message}=q_pin,no,6,6,10,Digits,no,no,`);
}

// הודעה לקליטת תשובה (ספרה אחת: 1-4)
function promptForAnswer(message: string = "ברגע שהמנחה מציג שאלה, הקש את מספר התשובה בין אחת לארבע") {
  return buildIvrResponse(`read=t-${message}=q_ans,no,1,1,15,Digits,no,no,`);
}

/**
 * חילוץ פרמטרים גמיש (GET & POST)
 */
async function parseParams(req: Request): Promise<Record<string, string>> {
  const params: Record<string, string> = {};

  try {
    const url = new URL(req.url);
    url.searchParams.forEach((val, key) => {
      params[key] = val;
    });

    if (req.method === "POST") {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await req.formData();
        formData.forEach((val, key) => {
          params[key] = String(val);
        });
      } else if (contentType.includes("application/json")) {
        const body = await req.json();
        Object.keys(body).forEach((key) => {
          params[key] = String(body[key]);
        });
      }
    }
  } catch (err) {
    console.error("[IVR PARSE ERROR]:", err);
  }

  return params;
}

/**
 * שידור בלייב למסך ללא חסימת השיחה (Async background execution)
 */
function broadcastEvent(channelName: string, event: string, payload: Record<string, any>) {
  supabase
    .channel(channelName)
    .send({ type: "broadcast", event, payload })
    .catch((err) => console.error(`[REALTIME ERROR] ${event}:`, err));
}

export async function GET(req: Request) {
  return handleIVR(req);
}

export async function POST(req: Request) {
  return handleIVR(req);
}

async function handleIVR(req: Request) {
  try {
    const params = await parseParams(req);

    console.log("=== Incoming IVR Payload ===", params);

    // 1. חילוץ מספר טלפון
    const phone = params.ApiPhone || params.phone || params.ApiPhoneFrom || "";
    if (!phone) {
      console.warn("[IVR]: No phone number received");
      return promptForPin();
    }

    // 2. חילוץ קלט (PIN או תשובה)
    const inputPin = params.q_pin || params.val_name_q_pin || params.pin || "";
    const inputAns = params.q_ans || params.val_name_q_ans || params.answer || "";

    // ---------------------------------------------------------
    // תרחיש א': המשתמש הקיש PIN בן 6 ספרות
    // ---------------------------------------------------------
    if (inputPin) {
      if (!/^\d{6}$/.test(inputPin)) {
        return promptForPin("קוד המשחק אינו תקין. הקש קוד בן שש ספרות בלבד");
      }

      // שמירת הסשן
      await supabase
        .from("ivr_sessions")
        .upsert({ phone, pin: inputPin }, { onConflict: "phone" });

      // רישום השחקן
      const playerName = `משתתף ${phone.slice(-4)}`;
      await supabase
        .from("game_players")
        .upsert(
          { game_pin: inputPin, phone, player_name: playerName },
          { onConflict: "game_pin,phone" }
        );

      // שידור ללוח המשחק בלייב
      broadcastEvent(`game_${inputPin}`, "PLAYER_JOINED", {
        playerId: phone,
        name: playerName,
        score: 0,
      });

      return promptForAnswer("התחברת בהצלחה! כשתופיע שאלה, הקש את מספר התשובה בין אחת לארבע");
    }

    // ---------------------------------------------------------
    // תרחיש ב': בדיקת סשן קיים לפי מספר הטלפון
    // ---------------------------------------------------------
    const { data: session } = await supabase
      .from("ivr_sessions")
      .select("pin")
      .eq("phone", phone)
      .maybeSingle();

    if (!session?.pin) {
      return promptForPin();
    }

    const activePin = session.pin;

    // ---------------------------------------------------------
    // תרחיש ג': המשתמש מחובר אך עדיין לא הקיש תשובה
    // ---------------------------------------------------------
    if (!inputAns) {
      return promptForAnswer();
    }

    // ---------------------------------------------------------
    // תרחיש ד': קליטת תשובה (1-4)
    // ---------------------------------------------------------
    const numericAns = parseInt(inputAns, 10);
    if (isNaN(numericAns) || numericAns < 1 || numericAns > 4) {
      return promptForAnswer("תשובה לא תקינה. הקש תשובה בין אחת לארבע");
    }

    const answerIndex = numericAns - 1;

    // שמירת התשובה ב-Supabase
    await supabase.from("game_answers").insert({
      game_pin: activePin,
      phone,
      answer_index: answerIndex,
    });

    // שידור התשובה בלייב למסך המנחה
    broadcastEvent(`game_${activePin}`, "SUBMIT_ANSWER", {
      playerId: phone,
      answerIndex,
      score: 0,
      timeTaken: 0,
    });

    return promptForAnswer("התשובה התקבלה! לשאלה הבאה הקש שוב את מספר התשובה");

  } catch (error) {
    console.error("[IVR FATAL ERROR]:", error);
    return promptForPin("אירעה תקלה זמנית במערכת. אנא הקש שוב את קוד המשחק");
  }
}
