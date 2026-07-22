import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handleRequest(req);
}

export async function POST(req: Request) {
  return handleRequest(req);
}

// תקנון מזהה טלפון לפורמט ספרות אחיד (למשל: 0501234567)
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

    const rawPhone =
      searchParams.get("ApiPhone") || searchParams.get("phone") || "";
    const phone = cleanPhone(rawPhone);

    const inputPin = String(
      searchParams.get("q_pin") || searchParams.get("val_name_q_pin") || ""
    ).trim();
    const inputAns = String(
      searchParams.get("q_ans") || searchParams.get("val_name_q_ans") || ""
    ).trim();
    const currentQ = parseInt(searchParams.get("q_num") || "0", 10);

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

    // 🛑 מקרה חירום/ניתוק: המנחה לחץ על "סיום משחק" והסטטוס שונה ל-FINISHED
    if (session?.status === "FINISHED") {
      // מנקים את הסשן מ-ivr_sessions ומשמיעים הודעת ניתוק
      await supabase.from("ivr_sessions").delete().eq("phone", phone);
      return sendIvrResponse("hangup=t-המשחק הסתיים תודה רבה ושלום,");
    }

    const activePin = session?.pin ? String(session.pin) : null;

    // === מקרה A: המשתמש מקיש PIN חדש במפורש (או שאין לו סשן עדיין) ===
    if (inputPin && inputPin !== activePin) {
      if (!/^\d{6}$/.test(inputPin)) {
        return sendIvrResponse(
          "read=t-קוד לא תקין הקש קוד בן שש ספרות=q_pin,no,6,6,10,Digits,no,no,"
        );
      }

      // שמירה/עדכון ב-ivr_sessions
      await supabase.from("ivr_sessions").upsert(
        {
          phone,
          pin: inputPin,
          status: "ACTIVE",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "phone" }
      );

      // הרשמה ב-game_players
      await supabase.from("game_players").upsert(
        {
          game_pin: inputPin,
          phone: phone,
          player_name: `טלפון ${phone.slice(-4)}`,
        },
        { onConflict: "game_pin,phone" }
      );

      return sendIvrResponse(
        "read=t-התחברת בהצלחה הקש את מספר התשובה=q_ans,no,1,1,15,Digits,no,no,"
      );
    }

    // === מקרה B: המשתמש כבר מחובר לסשן ===
    if (activePin) {
      // בדיקה שהמשחק/השחקן אכן קיימים ב-game_players
      const { data: activePlayer } = await supabase
        .from("game_players")
        .select("id")
        .eq("game_pin", activePin)
        .eq("phone", phone)
        .maybeSingle();

      // 🛑 אם השחקן/המשחק נמחק ע"י המנחה בסיום -> מנתקים את השיחה!
      if (!activePlayer) {
        await supabase.from("ivr_sessions").delete().eq("phone", phone);
        return sendIvrResponse("hangup=t-המשחק הסתיים תודה ששיחקתם,");
      }

      // קליטת תשובה (אם הוקשה)
      if (inputAns) {
        const numericAns = parseInt(inputAns, 10);

        if (!isNaN(numericAns) && numericAns >= 1 && numericAns <= 4) {
          // רישום התשובה ב-game_answers (אינדקס 0-3)
          await supabase.from("game_answers").insert({
            game_pin: activePin,
            phone: phone,
            answer_index: numericAns - 1,
            question_index: currentQ,
          });

          return sendIvrResponse(
            "read=t-התשובה נקלטה לשאלה הבאה הקש שוב=q_ans,no,1,1,15,Digits,no,no,"
          );
        } else {
          return sendIvrResponse(
            "read=t-תשובה לא תקינה הקש מקש בין אחת לארבע=q_ans,no,1,1,15,Digits,no,no,"
          );
        }
      }

      // אם מחובר ולא הקיש תשובה חדשה (מחכה לשאלה הבאה)
      return sendIvrResponse(
        "read=t-הקש את מספר התשובה=q_ans,no,1,1,15,Digits,no,no,"
      );
    }

    // === מקרה C: אין סשן ואין PIN ===
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

// פונקציית עזר להחזרת תגובת טקסט למרכזייה
function sendIvrResponse(text: string) {
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
