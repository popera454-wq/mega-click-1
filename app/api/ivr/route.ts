import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const TEXT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
};

/**
 * קורא נתונים גם מ-GET וגם מ-POST
 */
async function getIncomingData(req: Request): Promise<Record<string, string>> {
  const data: Record<string, string> = {};

  try {
    if (req.method === "POST") {
      const contentType = req.headers.get("content-type") || "";

      if (contentType.includes("application/x-www-form-urlencoded")) {
        const form = await req.formData();

        form.forEach((value, key) => {
          data[key] = String(value);
        });
      } else if (contentType.includes("application/json")) {
        const body = await req.json();

        Object.keys(body).forEach((key) => {
          data[key] = String(body[key]);
        });
      }
    }

    const url = new URL(req.url);

    url.searchParams.forEach((value, key) => {
      data[key] = value;
    });
  } catch (err) {
    console.error("Failed reading request", err);
  }

  return data;
}

function ivrResponse(text: string): Response {
  return new Response(text, {
    headers: TEXT_HEADERS,
  });
}

function askForPin() {
  return ivrResponse(
    "read=t-שלום וברוכים הבאים למערכת הטריוויה. הקש כעת את קוד המשחק בן שש הספרות=q_pin,no,6,6,10,Digits,no,no,"
  );
}

function askForAnswer() {
  return ivrResponse(
    "read=t-ברגע שהמנחה מציג שאלה, הקש את מספר התשובה בין אחת לארבע=q_ans,no,1,1,15,Digits,no,no,"
  );
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

    const phone =
      data.ApiPhone ||
      data.phone ||
      "";

    if (!phone) {
      console.warn("Missing phone number");

      return askForPin();
    }

    const inputPin =
      data.q_pin ||
      data.val_name_q_pin ||
      "";

    const inputAnswer =
      data.q_ans ||
      data.val_name_q_ans ||
      "";

    console.log({
      phone,
      inputPin,
      inputAnswer,
    });

    /**
     * ---------------------------------------------------
     * מצב 1
     * המשתמש הקיש PIN חדש
     * ---------------------------------------------------
     */

    if (inputPin) {
      if (!/^\d{6}$/.test(inputPin)) {
        console.warn("Illegal PIN:", inputPin);

        return ivrResponse(
          "read=t-קוד המשחק אינו תקין. הקש קוד בן שש ספרות=q_pin,no,6,6,10,Digits,no,no,"
        );
      }

      console.log("Saving IVR session...");

      const { error: sessionError } = await supabase
        .from("ivr_sessions")
        .upsert(
          {
            phone,
            pin: inputPin,
          },
          {
            onConflict: "phone",
          }
        );

      if (sessionError) {
        console.error(sessionError);

        return askForPin();
      }

      console.log("IVR session saved.");

      console.log("Saving player...");

      const playerName = `משתתף ${phone.slice(-4)}`;

      const { error: playerError } = await supabase
        .from("game_players")
        .upsert(
          {
            game_pin: inputPin,
            phone,
            player_name: playerName,
          },
          {
            onConflict: "game_pin,phone",
          }
        );

      if (playerError) {
        console.error(playerError);
      }

      console.log("Player saved.");

      try {
        await supabase.channel(`game_${inputPin}`).send({
          type: "broadcast",
          event: "PLAYER_JOINED",
          payload: {
            playerId: phone,
            name: playerName,
            score: 0,
          },
        });
      } catch (err) {
        console.error("Realtime error", err);
      }

      return askForAnswer();
    }

    /**
     * ---------------------------------------------------
     * אין PIN בבקשה
     * שולפים אותו מה-session
     * ---------------------------------------------------
     */

    const {
      data: session,
      error: sessionLookupError,
    } = await supabase
      .from("ivr_sessions")
      .select("pin")
      .eq("phone", phone)
      .maybeSingle();

    if (sessionLookupError) {
      console.error(sessionLookupError);

      return askForPin();
    }

    if (!session?.pin) {
      console.log("No session found");

      return askForPin();
    }

    const activeGamePin = session.pin;

    console.log("Active PIN:", activeGamePin);
    /**
     * ---------------------------------------------------
     * המשתמש עדיין לא הקיש תשובה
     * ---------------------------------------------------
     */

    if (!inputAnswer) {
      console.log("Waiting for answer...");

      return askForAnswer();
    }

    /**
     * ---------------------------------------------------
     * ולידציה של התשובה
     * ---------------------------------------------------
     */

    const numericAnswer = Number(inputAnswer);

    if (
      !Number.isInteger(numericAnswer) ||
      numericAnswer < 1 ||
      numericAnswer > 4
    ) {
      console.warn("Illegal answer:", inputAnswer);

      return ivrResponse(
        "read=t-נא להקיש תשובה בין אחת לארבע=q_ans,no,1,1,15,Digits,no,no,"
      );
    }

    const answerIndex = numericAnswer - 1;

    console.log("Saving answer...", {
      phone,
      game: activeGamePin,
      answerIndex,
    });

    const { error: answerError } = await supabase
      .from("game_answers")
      .insert({
        game_pin: activeGamePin,
        phone,
        answer_index: answerIndex,
      });

    if (answerError) {
      console.error("Failed saving answer", answerError);

      return ivrResponse(
        "read=t-אירעה תקלה בשמירת התשובה. נסה שוב=q_ans,no,1,1,15,Digits,no,no,"
      );
    }

    console.log("Answer saved successfully.");

    /**
     * ---------------------------------------------------
     * שליחת Broadcast למסך המשחק
     * ---------------------------------------------------
     */

    try {
      await supabase.channel(`game_${activeGamePin}`).send({
        type: "broadcast",
        event: "SUBMIT_ANSWER",
        payload: {
          playerId: phone,
          answerIndex,
          score: 0,
          timeTaken: 0,
        },
      });

      console.log("Realtime broadcast sent.");
    } catch (err) {
      console.error("Realtime broadcast failed", err);
    }

    return ivrResponse(
      "read=t-התשובה התקבלה בהצלחה. המתן לשאלה הבאה=q_ans,no,1,1,15,Digits,no,no,"
    );
  } catch (error) {
    console.error("========== IVR SERVER ERROR ==========");
    console.error(error);

    /**
     * חשוב:
     * בימות המשיח עדיף תמיד להחזיר תשובת IVR תקינה
     * ולא להפיל את השיחה.
     */

    return ivrResponse(
      "read=t-אירעה תקלה זמנית. אנא נסה שוב=q_pin,no,6,6,10,Digits,no,no,"
    );
  }
}

