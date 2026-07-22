import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handleRequest(req);
}

export async function POST(req: Request) {
  return handleRequest(req);
}

// ניקוי מספר טלפון לפורמט אחיד (למשל: 0501234567)
function cleanPhone(p: string): string {
  let cleaned = p.replace(/\D/g, "");
  if (cleaned.startsWith("972")) {
    cleaned = "0" + cleaned.slice(3);
  }
  return cleaned;
}

async function handleRequest(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // חילוץ פרמטרים משיחת ה-IVR
    const rawPhone =
      searchParams.get("ApiPhone") || searchParams.get("phone") || "";
    const phone = cleanPhone(rawPhone);

    const inputPin = String(
      searchParams.get("q_pin") || searchParams.get("val_name_q_pin") || ""
    ).trim();
    const inputAns = String(
      searchParams.get("q_ans") || searchParams.get("val_name_q_ans") || ""
    ).trim();

    // 1. בדיקת זיהוי טלפון
    if (!phone) {
      return sendIvrResponse(
        "read=t-שלום הקש את קוד המשחק=q_pin,no,6,6,10,Digits,no,no,"
      );
    }

    // 2. קבלת סשן פעיל מ-ivr_sessions
    const { data: session } = await supabase
      .from("ivr_sessions")
      .select("pin, status")
      .eq("phone", phone)
      .maybeSingle();

    // 🛑 מקרה ניתוק: המשחק סומן כ-FINISHED -> מנתקים את הקו מיידית
    if (session?.status === "FINISHED") {
      await supabase.from("ivr_sessions").delete().eq("phone", phone);
      return sendIvrResponse(
        "id_list_message=t-המשחק הסתיים תודה ששיחקתם&go_to_folder=hangup"
      );
    }

    const activePin = session?.pin ? String(session.pin) : null;

    // === מקרה A: הקשת PIN חדש (חיבור ראשוני או החלפת משחק) ===
    if (inputPin && inputPin !== activePin) {
      if (!/^\d{6}$/.test(inputPin)) {
        return sendIvrResponse(
          "read=t-קוד לא תקין הקש קוד בן שש ספרות=q_pin,no,6,6,10,Digits,no,no,"
        );
      }

      // ניקוי סשן ישן ויצירת סשן חדש ב-ivr_sessions
      await supabase.from("ivr_sessions").delete().eq("phone", phone);
      await supabase.from("ivr_sessions").insert({
        phone,
        pin: inputPin,
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      });

      // בדיקה אם השחקן כבר קיים ב-game_players
      const { data: existingPlayer } = await supabase
        .from("game_players")
        .select("id")
        .eq("game_pin", inputPin)
        .eq("phone", phone)
        .maybeSingle();

      if (!existingPlayer) {
        // הכנסה נקייה של השחקן ללוח
        await supabase.from("game_players").insert({
          game_pin: inputPin,
          phone: phone,
          player_name: `טלפון ${phone.slice(-4)}`,
          score: 0,
        });
      }

      return sendIvrResponse(
        "read=t-התחברת בהצלחה הקש את מספר התשובה=q_ans,no,1,1,15,Digits,no,no,"
      );
    }

    // === מקרה B: המשתמש מחובר לסשן פעיל ===
    if (activePin) {
      // בדיקה שהשחקן עדיין קיים ב-game_players (מוודא שהמנחה לא מחק אותו)
      const { data: activePlayer } = await supabase
        .from("game_players")
        .select("id")
        .eq("game_pin", activePin)
        .eq("phone", phone)
        .maybeSingle();

      // 🛑 אם המשחק/השחקן נמחק בשרת -> מנתקים
      if (!activePlayer) {
        await supabase.from("ivr_sessions").delete().eq("phone", phone);
        return sendIvrResponse(
          "id_list_message=t-המשחק הסתיים תודה ששיחקתם&go_to_folder=hangup"
        );
      }

      // קליטת תשובה (אם הוקשה)
      if (inputAns) {
        const numericAns = parseInt(inputAns, 10);

        if (!isNaN(numericAns) && numericAns >= 1 && numericAns <= 4) {
          const answerIndex = numericAns - 1; // המרה לאינדקס 0-3

          // שליפת זמן התחלת השאלה מהמשחק לחישוב ניקוד מהירות
          const { data: gameData } = await supabase
            .from("games")
            .select("current_question_index, question_start_time")
            .eq("pin", activePin)
            .maybeSingle();

          const currentQIndex = gameData?.current_question_index ?? 0;

          // 🧮 חישוב ניקוד לפי שניות (Speed Bonus)
          let timeBonus = 1000;
          if (gameData?.question_start_time) {
            const startTime = new Date(gameData.question_start_time).getTime();
            const elapsedSeconds = Math.max(0, (Date.now() - startTime) / 1000);
            const timeLimit = 30; // 30 שניות לשאלה
            const scoreFactor = Math.max(0, (timeLimit - elapsedSeconds) / timeLimit);
            timeBonus = Math.round(500 + 500 * scoreFactor);
          }

          // רישום/עדכון התשובה
          await supabase.from("game_answers").upsert(
            {
              game_pin: activePin,
              phone: phone,
              question_index: currentQIndex,
              answer_index: answerIndex,
              score_awarded: timeBonus,
              created_at: new Date().toISOString(),
            },
            { onConflict: "game_pin,phone,question_index" }
          );

          return sendIvrResponse(
            "read=t-התשובה נקלטה לשאלה הבאה הקש את מספר התשובה=q_ans,no,1,1,15,Digits,no,no,"
          );
        } else {
          return sendIvrResponse(
            "read=t-תשובה לא תקינה הקש מקש בין אחת לארבע=q_ans,no,1,1,15,Digits,no,no,"
          );
        }
      }

      // מחובר אך לא הקיש תשובה
      return sendIvrResponse(
        "read=t-הקש את מספר התשובה=q_ans,no,1,1,15,Digits,no,no,"
      );
    }

    // === מקרה C: דיפולט (אין PIN ואין סשן) ===
    return sendIvrResponse(
      "read=t-ברוכים הבאים הקש את קוד המשחק=q_pin,no,6,6,10,Digits,no,no,"
    );
  } catch (err) {
    console.error("שגיאת IVR:", err);
    return sendIvrResponse(
      "read=t-אירעה שגיאה הקש את קוד המשחק=q_pin,no,6,6,10,Digits,no,no,"
    );
  }
}

// החזרת תשובת טקסט מותאמת לימות המשיח
function sendIvrResponse(text: string) {
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
