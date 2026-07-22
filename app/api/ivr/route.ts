import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handleRequest(req);
}

export async function POST(req: Request) {
  return handleRequest(req);
}

// ניקוי מספר טלפון לפורמט אחיד
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

    // חילוץ נתונים מפרמטרי ימות המשיח
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

    // 🛑 מקרה א': המשחק הסתיים / הסשן סומן כ-FINISHED -> ניתוק חד-משמעי
    if (session?.status === "FINISHED") {
      await supabase.from("ivr_sessions").delete().eq("phone", phone);
      // ימות המשיח מנתקים כאשר מחזירים id_list_message עם סיומת hangup/exit
      return sendIvrResponse(
        "id_list_message=t-המשחק הסתיים תודה ששיחקתם&go_to_folder=hangup"
      );
    }

    const activePin = session?.pin ? String(session.pin) : null;

    // 3. שליפת המשחק הפעיל לפי PIN בשביל לדעת מה השאלה הנוכחית ומה זמן התחלתה
    const currentGamePin = activePin || (inputPin.length === 6 ? inputPin : null);
    let activeGame: any = null;

    if (currentGamePin) {
      const { data: game } = await supabase
        .from("games") // או טבלת המשחקים הפעילים שלך
        .select("id, current_question_index, question_start_time, status")
        .eq("pin", currentGamePin)
        .maybeSingle();

      activeGame = game;
    }

    // 🛑 אם המשחק נמחק מהמסד או שהסטטוס שלו שונה ל-ended
    if (activePin && (!activeGame || activeGame.status === "ended")) {
      await supabase.from("ivr_sessions").delete().eq("phone", phone);
      return sendIvrResponse(
        "id_list_message=t-המשחק הסתיים תודה ששיחקתם&go_to_folder=hangup"
      );
    }

    // === מקרה B: התחברות ראשונית עם PIN חדש (ורק אם עוד אין סשן פעיל ל-PIN הזה) ===
    if (inputPin && inputPin !== activePin) {
      if (!/^\d{6}$/.test(inputPin)) {
        return sendIvrResponse(
          "read=t-קוד לא תקין הקש קוד בן שש ספרות=q_pin,no,6,6,10,Digits,no,no,"
        );
      }

      // שמירה ב-ivr_sessions
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
          score: 0,
        },
        { onConflict: "game_pin,phone" }
      );

      // אחרי התחברות מוצלחת - עוברים ישר לקליטת תשובות (q_ans)
      return sendIvrResponse(
        "read=t-התחברת בהצלחה הקש את מספר התשובה=q_ans,no,1,1,15,Digits,no,no,"
      );
    }

    // === מקרה C: המשתמש כבר מחובר לסשן פעיל ===
    if (activePin) {
      const currentQIndex = activeGame?.current_question_index ?? 0;

      // קליטת תשובה (אם הוקשה)
      if (inputAns) {
        const numericAns = parseInt(inputAns, 10);

        if (!isNaN(numericAns) && numericAns >= 1 && numericAns <= 4) {
          const answerIndex = numericAns - 1; // המרה לאינדקס 0-3

          // 🧮 חישוב ניקוד מבוסס זמן (Speed Bonus)
          let timeBonus = 1000; // ניקוד מקסימלי לתשובה
          if (activeGame?.question_start_time) {
            const startTime = new Date(activeGame.question_start_time).getTime();
            const now = Date.now();
            const elapsedSeconds = Math.max(0, (now - startTime) / 1000);
            
            // הורדת ניקוד ככל שעובר זמן (לדוגמה: ירידה של 30 נקודות לכל שנייה, מינימום 500 נקודות)
            const timeLimit = 30; // 30 שניות לשאלה
            const scoreFactor = Math.max(0, (timeLimit - elapsedSeconds) / timeLimit);
            timeBonus = Math.round(500 + 500 * scoreFactor);
          }

          // רישום/עדכון התשובה ב-game_answers
          await supabase.from("game_answers").upsert(
            {
              game_pin: activePin,
              phone: phone,
              question_index: currentQIndex,
              answer_index: answerIndex,
              score_awarded: timeBonus, // שמירת הניקוד שהרוויח
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

      // אם מחובר אך עדיין לא הקיש תשובה לשאלה הנוכחית
      return sendIvrResponse(
        "read=t-הקש את מספר התשובה=q_ans,no,1,1,15,Digits,no,no,"
      );
    }

    // === מקרה D: אין סשן ואין PIN ===
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

// החזרת תשובה טקסטואלית המתאימה לימות המשיח
function sendIvrResponse(text: string) {
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
