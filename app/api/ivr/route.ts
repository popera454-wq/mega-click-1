import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handleRequest(req);
}

export async function POST(req: Request) {
  return handleRequest(req);
}

function cleanPhone(p: string): string {
  if (!p) return "";
  let cleaned = p.replace(/\D/g, "");
  if (cleaned.startsWith("972")) {
    cleaned = "0" + cleaned.slice(3);
  }
  return cleaned;
}

async function handleRequest(req: Request) {
  try {
    const url = new URL(req.url);
    const { searchParams } = url;

    let apiPhone = "";
    for (const [key, value] of searchParams.entries()) {
      const k = key.toLowerCase();
      if (k === "apiphone" || k === "api_phone" || k === "phone" || k === "apidid") {
        apiPhone = value;
        break;
      }
    }

    const phone = cleanPhone(apiPhone);

    if (!phone) {
      return new Response("id_list_message=f-שגיאה בזיהוי מספר הטלפון", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    let inputPin = "";
    let inputAns = "";
    let inputRange = "";

    for (const [key, value] of searchParams.entries()) {
      const k = key.toLowerCase();
      if (k.includes("q_pin") || k.includes("pin")) inputPin = value;
      if (k.includes("q_ans") || k.includes("ans")) inputAns = value;
      if (k.includes("q_range") || k.includes("range")) inputRange = value;
    }

    inputPin = inputPin.trim();
    inputAns = inputAns.trim();
    inputRange = inputRange.trim();

    const { data: session } = await supabase
      .from("ivr_sessions")
      .select("pin, status")
      .eq("phone", phone)
      .maybeSingle();

    const activePin = session?.pin ? String(session.pin) : null;

    if ((inputPin && inputPin !== activePin) || (!activePin && inputPin)) {
      if (!/^\d{6}$/.test(inputPin)) {
        return makeIvrRead("קוד שגוי. נא להקיש קוד בן 6 ספרות", "q_pin", 6, 6);
      }

      const { data: game } = await supabase
        .from("games")
        .select("pin, status")
        .eq("pin", inputPin)
        .maybeSingle();

      if (!game || String(game.status).toLowerCase() === "finished") {
        return makeIvrRead("המשחק לא קיים או שהסתיים. נא להקיש קוד אחר", "q_pin", 6, 6);
      }

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

      return makeIvrWait("התחברת בהצלחה. ממתין להתחלת המשחק");
    }

    if (activePin) {
      const { data: gameData } = await supabase
        .from("games")
        .select("quiz_id, current_question_index, question_start_time, status")
        .eq("pin", activePin)
        .maybeSingle();

      if (!gameData || String(gameData.status).toLowerCase() === "finished") {
        await supabase.from("ivr_sessions").delete().eq("phone", phone);
        return makeIvrWait("המשחק הסתיים. תודה רבה");
      }

      if (String(gameData.status).toLowerCase() === "waiting") {
        return makeIvrWait("ממתינים להתחלת המשחק");
      }

      const currentQIndex = gameData.current_question_index ?? 0;

      const { data: questions } = await supabase
        .from("questions")
        .select("question_type, time_limit, min_range, max_range, correct_option, correct_range_value")
        .eq("quiz_id", gameData.quiz_id)
        .order("created_at", { ascending: true });

      const questionData = questions[currentQIndex];

      const qType = questionData?.question_type || "single_choice";
      const timeLimit = questionData?.time_limit ?? 30;

      const { data: existingAnswer } = await supabase
        .from("game_answers")
        .select("id")
        .eq("game_pin", activePin)
        .eq("phone", phone)
        .eq("question_index", currentQIndex)
        .maybeSingle();

      const submittedAnswer = qType === "range" ? inputRange : inputAns;

      if (submittedAnswer && !existingAnswer) {
        const answerTime = new Date();
        let timeBonus = 1000;

        if (gameData?.question_start_time) {
          const startTime = new Date(gameData.question_start_time).getTime();
          const elapsedSeconds = Math.max(0, (answerTime.getTime() - startTime) / 1000);
          const scoreFactor = Math.max(0, (timeLimit - elapsedSeconds) / timeLimit);
          timeBonus = Math.round(500 + 500 * scoreFactor);
        }

        let isCorrect = false;

        if (qType === "range") {
          isCorrect = Number(submittedAnswer) === Number(questionData.correct_range_value);
        } else {
          isCorrect = Number(submittedAnswer) === Number(questionData.correct_option);
        }

        const totalScore = (isCorrect ? 1000 : 0) + timeBonus;

        let answerIndex: number | null = null;
        let answerValue: string | null = null;

        if (qType === "range") {
          answerValue = String(submittedAnswer);
        } else {
          const numericAns = parseInt(submittedAnswer, 10);
          if (!isNaN(numericAns)) answerIndex = numericAns;
        }

        await supabase.from("game_answers").upsert(
          {
            game_pin: activePin,
            phone: phone,
            question_index: currentQIndex,
            answer_index: answerIndex,
            answer_value: answerValue,
            score_awarded: totalScore,
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
            .update({ score: (player.score || 0) + totalScore })
            .eq("game_pin", activePin)
            .eq("phone", phone);
        }

        return makeIvrWait("התשובה נקלטה. המתן לשאלה הבאה");
      }

      if (existingAnswer) {
        return makeIvrWait("ממתין לשאלה הבאה");
      }

      if (qType === "range") {
        return makeIvrRead("שאלת טווח. הקש מספר וסיום בסולמית", "q_range", 1, 6, timeLimit);
      } else {
        return makeIvrRead("הקש את מספר התשובה", "q_ans", 1, 1, timeLimit);
      }
    }

    return makeIvrRead("ברוכים הבאים. נא להקיש את קוד המשחק בן 6 הספרות", "q_pin", 6, 6);

  } catch (err) {
    console.error("IVR System Error:", err);
    return new Response("id_list_message=f-אירעה שגיאה כללית במערכת", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

function makeIvrRead(text: string, valName: string, minDigits = 1, maxDigits = 1, timeout = 10) {
  return new Response(`read=t-${text}=${valName},no,${minDigits},${maxDigits},${timeout},Digits,no,no`, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function makeIvrWait(text: string) {
  return new Response(`read=t-${text}=q_wait,no,1,1,2,Digits,no,no`, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
