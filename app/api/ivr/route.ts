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

    if (!phone) {
      return sendIvrResponse("read=t-שלום הקש את קוד המשחק=q_pin,no,6,6,10,Digits,no,no,");
    }

    const { data: session } = await supabase
      .from("ivr_sessions")
      .select("pin, status")
      .eq("phone", phone)
      .maybeSingle();

    if (session?.status === "FINISHED") {
      await supabase.from("ivr_sessions").delete().eq("phone", phone);
      return sendIvrResponse("read=t-המשחק הסתיים תודה ששיחקתם=q_dummy,no,0,0,3,Digits,no,no,");
    }

    const activePin = session?.pin ? String(session.pin) : null;

    // === מקרה א': כניסה למשחק חדש ===
    if ((inputPin && inputPin !== activePin) || (!activePin && inputPin)) {
      if (!/^\d{6}$/.test(inputPin)) {
        return sendIvrResponse("read=t-קוד לא תקין הקש קוד בן שש ספרות=q_pin,no,6,6,10,Digits,no,no,");
      }

      const { data: rawGames } = await supabase
        .from("games")
        .select("id, pin, status");

      const validGame = rawGames?.find(
        (g) => String(g.pin).trim() === inputPin && String(g.status).toLowerCase() !== "finished"
      );

      if (!validGame) {
        return sendIvrResponse("read=t-משחק לא קיים או שהסתיים נסה שוב=q_pin,no,6,6,10,Digits,no,no,");
      }

      await supabase.from("ivr_sessions").upsert(
        {
          phone,
          pin: inputPin,
          status: "ACTIVE",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "phone" }
      );

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

      return sendIvrResponse("read=t-התחברת בהצלחה הקש את מספר התשובה=q_ans,no,1,1,15,Digits,no,no,");
    }

    // === מקרה ב': משתמש מחובר ===
    if (activePin) {
      const { data: gameData } = await supabase
        .from("games")
        .select("current_question_index, question_start_time, status")
        .eq("pin", activePin)
        .maybeSingle();

      if (!gameData || String(gameData.status).toLowerCase() === "finished") {
        await supabase.from("ivr_sessions").delete().eq("phone", phone);
        return sendIvrResponse("read=t-המשחק הסתיים תודה רבה=q_dummy,no,0,0,3,Digits,no,no,");
      }

      const currentQIndex = gameData.current_question_index ?? 0;

      // בדיקת סוג השאלה
      const { data: questionData } = await supabase
        .from("questions")
        .select("question_type")
        .eq("game_pin", activePin)
        .eq("question_index", currentQIndex)
        .maybeSingle();

      const qType = questionData?.question_type || "single_choice";
      const submittedAnswer = qType === "range" ? inputRange : inputAns;

      // בדיקה האם השחקן כבר ענה על השאלה הנוכחית
      const { data: existingAnswer } = await supabase
        .from("game_answers")
        .select("question_index")
        .eq("game_pin", activePin)
        .eq("phone", phone)
        .eq("question_index", currentQIndex)
        .maybeSingle();

      // אם המשתמש שלח תשובה עכשיו
      if (submittedAnswer && !existingAnswer) {
        const answerTime = new Date();
        let timeBonus = 1000;

        if (gameData?.question_start_time) {
          const startTime = new Date(gameData.question_start_time).getTime();
          const elapsedSeconds = Math.max(0, (answerTime.getTime() - startTime) / 1000);
          const timeLimit = 30;
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

        // שמירת התשובה עם זמן הלחיצה המדויק
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

        // הודעה שקטה/קצרה שלא מבקשת שוב קלט אלא מעבירה למצב המתנה לשאלה הבאה
        return sendIvrResponse("id_list_message=t-התשובה נקלטה בהצלחה. המתן לשאלה הבאה");
      }

      // אם כבר ענה בעבר על השאלה הנוכחית – לא מציקים לו ולא שואלים שוב, רק מחכים בסבלנות בשקט
      if (existingAnswer) {
        return sendIvrResponse("id_list_message=t-התשובה כבר נקלטה. ממתין לשאלה הבאה");
      }

      // אם טרם ענה - נציג את השאלה פעם אחת בלבד עם זמן השהייה ארוך (20 שניות) למניעת קריאות חוזרות ונשנות
      if (qType === "range") {
        return sendIvrResponse("read=t-הקש את המספר הרצוי וסיום בסולמית=q_range,no,1,6,20,Digits,no,no,");
      } else if (qType === "poll") {
        return sendIvrResponse("read=t-שאלת סקר הקש את מספר התשובה=q_ans,no,1,1,20,Digits,no,no,");
      } else {
        return sendIvrResponse("read=t-הקש את מספר התשובה=q_ans,no,1,1,20,Digits,no,no,");
      }
    }

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
