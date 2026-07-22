import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handleRequest(req);
}

export async function POST(req: Request) {
  return handleRequest(req);
}

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
      searchParams.get("ApiPhone") ||
      searchParams.get("phone") ||
      searchParams.get("ApiDID") ||
      "";
    const phone = cleanPhone(rawPhone);

    const inputPin = String(
      searchParams.get("q_pin") || searchParams.get("val_name_q_pin") || ""
    ).trim();
    const inputAns = String(
      searchParams.get("q_ans") || searchParams.get("val_name_q_ans") || ""
    ).trim();
    const inputRange = String(
      searchParams.get("q_range") || searchParams.get("val_name_q_range") || ""
    ).trim();

    // 1. במידה ולא נשלח טלפון - מבקשים קוד משחק
    if (!phone) {
      return sendIvrResponse(
        "read=t-ברוכים הבאים למערכת המשחק בלייב. נא להקיש את קוד המשחק בן 6 הספרות=q_pin,no,6,6,10,Digits,no,no,"
      );
    }

    // 2. בדיקת סשן פעיל
    const { data: session } = await supabase
      .from("ivr_sessions")
      .select("pin, status")
      .eq("phone", phone)
      .maybeSingle();

    if (session?.status === "FINISHED") {
      await supabase.from("ivr_sessions").delete().eq("phone", phone);
      return sendIvrResponse(
        "read=t-המשחק הסתיים. תודה רבה ששיחקתם איתנו=q_dummy,no,0,0,1,Digits,no,no,"
      );
    }

    const activePin = session?.pin ? String(session.pin) : null;

    // === מקרה א': הקשת קוד משחק בכניסה ===
    if ((inputPin && inputPin !== activePin) || (!activePin && inputPin)) {
      if (!/^\d{6}$/.test(inputPin)) {
        return sendIvrResponse(
          "read=t-קוד לא תקין. נא להקיש קוד בן 6 ספרות=q_pin,no,6,6,10,Digits,no,no,"
        );
      }

      const { data: game } = await supabase
        .from("games")
        .select("pin, status")
        .eq("pin", inputPin)
        .maybeSingle();

      if (!game || String(game.status).toLowerCase() === "finished") {
        return sendIvrResponse(
          "read=t-המשחק לא קיים או שהסתיים. נסה קוד אחר=q_pin,no,6,6,10,Digits,no,no,"
        );
      }

      // שמירת סשן חדש
      await supabase.from("ivr_sessions").upsert(
        {
          phone,
          pin: inputPin,
          status: "ACTIVE",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "phone" }
      );

      // רישום השחקן למשחק
      await supabase
        .from("game_players")
        .delete()
        .eq("game_pin", inputPin)
        .eq("phone", phone);

      await supabase.from("game_players").insert({
        game_pin: inputPin,
        phone: phone,
        player_name: `טלפון ${phone.slice(-4)}`,
        score: 0,
      });

      // הודעת פתיחה מיוחדת בלייב + מעבר ללולאת המתנה שקטה (q_wait)
      return sendIvrResponse(
        "read=t-ברוכים הבאים למערכת המשחק בלייב. חיבור בוצע בהצלחה. המתן לשאלה הראשונה=q_wait,no,1,1,2,Digits,no,no,"
      );
    }

    // === מקרה ב': משתמש מחובר - ניהול המשחק בלייב ===
    if (activePin) {
      const { data: gameData } = await supabase
        .from("games")
        .select("current_question_index, question_start_time, status")
        .eq("pin", activePin)
        .maybeSingle();

      if (!gameData || String(gameData.status).toLowerCase() === "finished") {
        await supabase.from("ivr_sessions").delete().eq("phone", phone);
        return sendIvrResponse(
          "read=t-המשחק הסתיים. תודה רבה ששיחקתם איתנו=q_dummy,no,0,0,1,Digits,no,no,"
        );
      }

      // המשחק עדיין לא התחיל על ידי המנהל
      if (String(gameData.status).toLowerCase() === "waiting") {
        return sendIvrResponse(
          "read=t-ממתינים להתחלת המשחק=q_wait,no,1,1,3,Digits,no,no,"
        );
      }

      const currentQIndex = gameData.current_question_index ?? 0;

      // שליפת הנתונים וההגדרות של השאלה הנוכחית
      const { data: questionData } = await supabase
        .from("questions")
        .select("question_type, digits_min, digits_max, time_limit")
        .eq("game_pin", activePin)
        .eq("question_index", currentQIndex)
        .maybeSingle();

      const qType = questionData?.question_type || "single_choice";
      const digitsMin = questionData?.digits_min ?? 1;
      const digitsMax = questionData?.digits_max ?? (qType === "range" ? 6 : 1);
      const timeLimit = questionData?.time_limit ?? 30;

      // בדיקה האם השחקן כבר ענה על השאלה הזו
      const { data: existingAnswer } = await supabase
        .from("game_answers")
        .select("id")
        .eq("game_pin", activePin)
        .eq("phone", phone)
        .eq("question_index", currentQIndex)
        .maybeSingle();

      const submittedAnswer = qType === "range" ? inputRange : inputAns;

      // 1. במידה והתקבלה תשובה חדשה עכשיו
      if (submittedAnswer && !existingAnswer) {
        const answerTime = new Date();
        let timeBonus = 1000;

        if (gameData?.question_start_time) {
          const startTime = new Date(gameData.question_start_time).getTime();
          const elapsedSeconds = Math.max(0, (answerTime.getTime() - startTime) / 1000);
          const scoreFactor = Math.max(0, (timeLimit - elapsedSeconds) / timeLimit);
          timeBonus = Math.round(500 + 500 * scoreFactor);
        }

        let answerIndex: number | null = null;
        let answerValue: string | null = null;

        if (qType === "range") {
          answerValue = String(submittedAnswer);
        } else {
          const numericAns = parseInt(submittedAnswer, 10);
          if (!isNaN(numericAns)) {
            answerIndex = numericAns - 1;
          }
        }

        // שמירת התשובה במדויק
        await supabase.from("game_answers").upsert(
          {
            game_pin: activePin,
            phone: phone,
            question_index: currentQIndex,
            answer_index: answerIndex,
            answer_value: answerValue,
            score_awarded: timeBonus,
            created_at: answerTime.toISOString(),
          },
          { onConflict: "game_pin,phone,question_index" }
        );

        // עדכון הניקוד הכולל של השחקן
        const { data: player } = await supabase
          .from("game_players")
          .select("score")
          .eq("game_pin", activePin)
          .eq("phone", phone)
          .maybeSingle();

        if (player) {
          await supabase
            .from("game_players")
            .update({ score: (player.score || 0) + timeBonus })
            .eq("game_pin", activePin)
            .eq("phone", phone);
        }

        // השמעת אישור ומעבר מידי ללולאת המתנה שקטה לשאלה הבאה
        return sendIvrResponse(
          "read=t-התשובה נקלטה בהצלחה. המתן לשאלה הבאה=q_wait,no,1,1,2,Digits,no,no,"
        );
      }

      // 2. במידה והמשתמש כבר ענה בעבר על השאלה הנוכחית - נשאר בלולאת המתנה שקטה
      if (existingAnswer) {
        return sendIvrResponse(
          "read=t-התשובה נקלטה. ממתין לשאלה הבאה=q_wait,no,1,1,3,Digits,no,no,"
        );
      }

      // 3. השחקן טרם ענה - משמיעים את הנחיית ההקשה לפי סוג השאלה
      if (qType === "range") {
        return sendIvrResponse(
          `read=t-שאלת טווח. הקש את המספר וסיום בסולמית=q_range,no,${digitsMin},${digitsMax},${timeLimit},Digits,no,no,`
        );
      } else if (qType === "poll") {
        return sendIvrResponse(
          `read=t-שאלת סקר. הקש את מספר התשובה=q_ans,no,1,1,${timeLimit},Digits,no,no,`
        );
      } else {
        return sendIvrResponse(
          `read=t-הקש את מספר התשובה=q_ans,no,1,1,${timeLimit},Digits,no,no,`
        );
      }
    }

    // ברירת מחדל - הקשת קוד
    return sendIvrResponse(
      "read=t-ברוכים הבאים למערכת המשחק בלייב. נא להקיש את קוד המשחק=q_pin,no,6,6,10,Digits,no,no,"
    );
  } catch (err) {
    console.error("IVR Error:", err);
    // מניעת ה"אין שלוחה" - החזרת תשובה תקינה לימות המשיח גם בעת שגיאה בשרת
    return sendIvrResponse(
      "read=t-אנא המתן למערכת=q_wait,no,1,1,3,Digits,no,no,"
    );
  }
}

function sendIvrResponse(text: string) {
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
