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

    // 1. אם אין טלפון מזוהה
    if (!phone) {
      return sendIvrResponse(
        "read=t-ברוכים הבאים. נא להקיש את קוד המשחק=q_pin,no,6,6,10,Digits,no,no,"
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
        "read=t-המשחק הסתיים. תודה רבה=q_wait,no,1,1,2,Digits,no,no,"
      );
    }

    const activePin = session?.pin ? String(session.pin) : null;

    // === מקרה א': הקשת קוד משחק בכניסה ===
    if ((inputPin && inputPin !== activePin) || (!activePin && inputPin)) {
      if (!/^\d{6}$/.test(inputPin)) {
        return sendIvrResponse(
          "read=t-קוד שגוי. נא להקיש 6 ספרות=q_pin,no,6,6,10,Digits,no,no,"
        );
      }

      const { data: game } = await supabase
        .from("games")
        .select("pin, status")
        .eq("pin", inputPin)
        .maybeSingle();

      if (!game || String(game.status).toLowerCase() === "finished") {
        return sendIvrResponse(
          "read=t-משחק לא קיים או שהסתיים. נסה קוד אחר=q_pin,no,6,6,10,Digits,no,no,"
        );
      }

      // שמירת הסשן והרשמת השחקן
      await supabase.from("ivr_sessions").upsert(
        { phone, pin: inputPin, status: "ACTIVE", updated_at: new Date().toISOString() },
        { onConflict: "phone" }
      );

      await supabase.from("game_players").delete().eq("game_pin", inputPin).eq("phone", phone);
      await supabase.from("game_players").insert({
        game_pin: inputPin,
        phone: phone,
        player_name: `טלפון ${phone.slice(-4)}`,
        score: 0,
      });

      // כניסה בלתי מתנתקת ללולאת המתנה
      return sendIvrResponse(
        "read=t-התחברת בהצלחה. ממתין להתחלת המשחק=q_wait,no,1,1,2,Digits,no,no,"
      );
    }

    // === מקרה ב': שחקן מחובר (לולאת המשחק) ===
    if (activePin) {
      const { data: gameData } = await supabase
        .from("games")
        .select("current_question_index, question_start_time, status")
        .eq("pin", activePin)
        .maybeSingle();

      if (!gameData || String(gameData.status).toLowerCase() === "finished") {
        await supabase.from("ivr_sessions").delete().eq("phone", phone);
        return sendIvrResponse(
          "read=t-המשחק הסתיים. תודה ששיחקתם=q_wait,no,1,1,2,Digits,no,no,"
        );
      }

      // המשחק עדיין בסטטוס המתנה בפאנל
      if (String(gameData.status).toLowerCase() === "waiting") {
        return sendIvrResponse(
          "read=t-ממתינים להתחלת המשחק=q_wait,no,1,1,2,Digits,no,no,"
        );
      }

      const currentQIndex = gameData.current_question_index ?? 0;

      // שליפת הגדרות השאלה
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

      // בדיקה אם ענה כבר על השאלה הזו
      const { data: existingAnswer } = await supabase
        .from("game_answers")
        .select("id")
        .eq("game_pin", activePin)
        .eq("phone", phone)
        .eq("question_index", currentQIndex)
        .maybeSingle();

      const submittedAnswer = qType === "range" ? inputRange : inputAns;

      // 1. קליטת תשובה חדשה שנלחצה עכשיו
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
          if (!isNaN(numericAns)) answerIndex = numericAns - 1;
        }

        // שמירת תשובה וחישוב ניקוד
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

        // עבר להמתנה לשאלה הבאה (בלולאה שאינה מתנתקת)
        return sendIvrResponse(
          "read=t-התשובה נקלטה. המתן לשאלה הבאה=q_wait,no,1,1,2,Digits,no,no,"
        );
      }

      // 2. אם כבר ענה על השאלה הזו - ממשיך לחכות לשאלה הבאה
      if (existingAnswer) {
        return sendIvrResponse(
          "read=t-ממתין לשאלה הבאה=q_wait,no,1,1,2,Digits,no,no,"
        );
      }

      // 3. השחקן טרם ענה - השמעת השאלה וקבלת המקשים
      if (qType === "range") {
        return sendIvrResponse(
          `read=t-שאלת טווח. הקש את המספר וסיום בסולמית=q_range,no,${digitsMin},${digitsMax},${timeLimit},Digits,no,no,`
        );
      } else {
        return sendIvrResponse(
          `read=t-הקש את מספר התשובה=q_ans,no,1,1,${timeLimit},Digits,no,no,`
        );
      }
    }

    return sendIvrResponse(
      "read=t-ברוכים הבאים. נא להקיש את קוד המשחק=q_pin,no,6,6,10,Digits,no,no,"
    );
  } catch (err) {
    console.error("IVR Error:", err);
    // החזרת תשובה תקינה לימות המשיח גם במקרה שגיאה כדי למנוע ניתוק
    return sendIvrResponse(
      "read=t-אנא המתן למערכת=q_wait,no,1,1,2,Digits,no,no,"
    );
  }
}

function sendIvrResponse(text: string) {
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
