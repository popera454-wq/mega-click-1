import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handleRequest(req);
}

export async function POST(req: Request) {
  return handleRequest(req);
}

// ניקוי מספר טלפון לפורמט אחיד נקי (ספרות בלבד)
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

    const rawPhone = searchParams.get("ApiPhone") || searchParams.get("phone") || searchParams.get("ApiDID") || "";
    const phone = cleanPhone(rawPhone);
    const inputPin = String(searchParams.get("q_pin") || searchParams.get("val_name_q_pin") || "").trim();
    const inputAns = String(searchParams.get("q_ans") || searchParams.get("val_name_q_ans") || "").trim();

    // אין זיהוי טלפון
    if (!phone) {
      return sendIvrResponse("read=t-שלום הקש את קוד המשחק=q_pin,no,6,6,10,Digits,no,no,");
    }

    // קבלת סשן טלפוני קיים
    const { data: session } = await supabase
      .from("ivr_sessions")
      .select("pin, status")
      .eq("phone", phone)
      .maybeSingle();

    // מקרה ניתוק - המשחק הוגדר כהסתיים
    if (session?.status === "FINISHED") {
      await supabase.from("ivr_sessions").delete().eq("phone", phone);
      return sendIvrResponse("id_list_message=t-המשחק הסתיים תודה ששיחקתם&go_to_folder=hangup");
    }

    const activePin = session?.pin ? String(session.pin) : null;

    // === מקרה א': המשתמש מקיש PIN (או שאין סשן פעיל) ===
    if ((inputPin && inputPin !== activePin) || (!activePin && inputPin)) {
      if (!/^\d{6}$/.test(inputPin)) {
        return sendIvrResponse("read=t-קוד לא תקין הקש קוד בן שש ספרות=q_pin,no,6,6,10,Digits,no,no,");
      }

      // בדיקה שהמשחק אכן קיים ופעיל בטבלת games
      const { data: gameExists } = await supabase
        .from("games")
        .select("id")
        .eq("pin", inputPin)
        .neq("status", "finished")
        .maybeSingle();

      if (!gameExists) {
        return sendIvrResponse("read=t-משחק לא קיים או שהסתיים נסה שוב=q_pin,no,6,6,10,Digits,no,no,");
      }

      // שמירת/עדכון החיבור בסשן (שימוש ב-upsert במקום delete+insert למניעת שגיאות DB)
      await supabase.from("ivr_sessions").upsert(
        {
          phone,
          pin: inputPin,
          status: "ACTIVE",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "phone" }
      );

      // כניסה למשחק (טבלת שחקנים)
      const { data: existingPlayer } = await supabase
        .from("game_players")
        .select("id")
        .eq("game_pin", inputPin)
        .eq("phone", phone)
        .maybeSingle();

      if (!existingPlayer) {
        await supabase.from("game_players").insert({
          game_pin: inputPin,
          phone: phone,
          player_name: `טלפון ${phone.slice(-4)}`,
          score: 0,
        });
      }

      // החזרת הוראה ברורה לקליטת תשובה
      return sendIvrResponse("read=t-התחברת בהצלחה הקש את מספר התשובה=q_ans,no,1,1,15,Digits,no,no,");
    }

    // === מקרה ב': המשתמש מחובר ויש לו סשן פעיל ===
    if (activePin) {
      // קליטת תשובה מהמשתמש
      if (inputAns) {
        const numericAns = parseInt(inputAns, 10);

        if (!isNaN(numericAns) && numericAns >= 1 && numericAns <= 4) {
          const answerIndex = numericAns - 1; 

          const { data: gameData } = await supabase
            .from("games")
            .select("current_question_index, question_start_time")
            .eq("pin", activePin)
            .maybeSingle();

          const currentQIndex = gameData?.current_question_index ?? 0;

          let timeBonus = 1000;
          if (gameData?.question_start_time) {
            const startTime = new Date(gameData.question_start_time).getTime();
            const elapsedSeconds = Math.max(0, (Date.now() - startTime) / 1000);
            const timeLimit = 30;
            const scoreFactor = Math.max(0, (timeLimit - elapsedSeconds) / timeLimit);
            timeBonus = Math.round(500 + 500 * scoreFactor);
          }

          // שמירת התשובה
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

          return sendIvrResponse("read=t-התשובה נקלטה לשאלה הבאה הקש את מספר התשובה=q_ans,no,1,1,15,Digits,no,no,");
        } else {
          return sendIvrResponse("read=t-תשובה לא תקינה הקש מקש בין אחת לארבע=q_ans,no,1,1,15,Digits,no,no,");
        }
      }

      // אם מחובר אבל עדיין לא שלח תשובה לבקשה הנוכחית
      return sendIvrResponse("read=t-הקש את מספר התשובה=q_ans,no,1,1,15,Digits,no,no,");
    }

    // === מקרה ג': ברירת מחדל ===
    return sendIvrResponse("read=t-ברוכים הבאים הקש את קוד המשחק=q_pin,no,6,6,10,Digits,no,no,");
    
  } catch (err) {
    console.error("IVR Error:", err);
    return sendIvrResponse("read=t-אירעה שגיאה הקש את קוד המשחק=q_pin,no,6,6,10,Digits,no,no,");
  }
}

function sendIvrResponse(text: string) {
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
