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
  if (cleaned.startsWith("972")) cleaned = "0" + cleaned.slice(3);
  return cleaned;
}

function sanitizeText(t: string): string {
  return t.replace(/[.,]/g, "").trim();
}

async function handleRequest(req: Request) {
  try {
    const url = new URL(req.url);
    const { searchParams } = url;

    // --- זיהוי מספר המתקשר ---
    let apiPhone =
      searchParams.get("phone") ||
      searchParams.get("callerid") ||
      searchParams.get("api_callerid") ||
      searchParams.get("apidid") ||
      searchParams.get("did") ||
      searchParams.get("api_phone") ||
      searchParams.get("apiphone") ||
      "";

    const phone = cleanPhone(apiPhone);

    if (!phone || phone.length < 9) {
      return new Response("id_list_message=f-שגיאה בזיהוי מספר הטלפון", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // --- קבלת פרמטרים ---
    const inputPin = (searchParams.get("q_pin") || "").trim();
    const inputAns = (searchParams.get("q_ans") || "").trim();
    const inputRange = (searchParams.get("q_range") || "").trim();

    // --- בדיקת סשן ---
    const { data: session } = await supabase
      .from("ivr_sessions")
      .select("pin, status")
      .eq("phone", phone)
      .maybeSingle();

    const activePin = session?.pin || null;

    // --- התחברות למשחק ---
    if (inputPin && inputPin !== activePin) {
      if (!/^\d{6}$/.test(inputPin)) {
        return makeIvrRead("קוד שגוי נא להקיש קוד בן 6 ספרות", "q_pin", 6, 6);
      }

      const { data: game } = await supabase
        .from("games")
        .select("pin, status")
        .eq("pin", inputPin)
        .maybeSingle();

      if (!game || game.status === "finished") {
        return makeIvrRead("המשחק לא קיים או הסתיים נא להקיש קוד אחר", "q_pin", 6, 6);
      }

      await supabase.from("ivr_sessions").upsert(
        { phone, pin: inputPin, status: "ACTIVE", updated_at: new Date().toISOString() },
        { onConflict: "phone" }
      );

      await supabase.from("game_players").delete().eq("game_pin", inputPin).eq("phone", phone);

      await supabase.from("game_players").insert({
        game_pin: inputPin,
        phone,
        player_name: `טלפון ${phone.slice(-4)}`,
        score: 0,
      });

      return makeIvrWait("התחברת בהצלחה ממתין להתחלת המשחק");
    }

    // --- שחקן מחובר ---
    if (activePin) {
      const { data: gameData } = await supabase
        .from("games")
        .select("quiz_id, current_question_index, question_start_time, status")
        .eq("pin", activePin)
        .maybeSingle();

      if (!gameData || gameData.status === "finished") {
        await supabase.from("ivr_sessions").delete().eq("phone", phone);

        // חישוב מקום
        const { data: players } = await supabase
          .from("game_players")
          .select("phone, score")
          .eq("game_pin", activePin)
          .order("score", { ascending: false });

        const rank = players.findIndex((p) => p.phone === phone) + 1;

        return makeIvrWait(`המשחק הסתיים הגעת למקום ${rank}`);
      }

      if (gameData.status === "waiting") {
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

      const submittedAnswer =
        qType === "range" ? inputRange : inputAns;

      // --- קבלת תשובה ---
      if (submittedAnswer && !existingAnswer) {
        const answerTime = new Date();

        let timeBonus = 1000;
        if (gameData.question_start_time) {
          const startTime = new Date(gameData.question_start_time).getTime();
          const elapsed = (answerTime.getTime() - startTime) / 1000;
          const factor = Math.max(0, (timeLimit - elapsed) / timeLimit);
          timeBonus = Math.round(500 + 500 * factor);
        }

        let isCorrect = false;

        if (qType === "range") {
          isCorrect = Number(submittedAnswer) === Number(questionData.correct_range_value);
        } else if (qType === "true_false") {
          isCorrect = Number(submittedAnswer) === Number(questionData.correct_option);
        } else {
          isCorrect = Number(submittedAnswer) === Number(questionData.correct_option);
        }

        const totalScore = (isCorrect ? 1000 : 0) + timeBonus;

        await supabase.from("game_answers").upsert(
          {
            game_pin: activePin,
            phone,
            question_index: currentQIndex,
            answer_index: qType === "range" ? null : Number(submittedAnswer),
            answer_value: qType === "range" ? submittedAnswer : null,
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

        return makeIvrWait("התשובה נקלטה המתן לשאלה הבאה");
      }

      if (existingAnswer) {
        return makeIvrWait("ממתין לשאלה הבאה");
      }

      // --- הצגת שאלה לפי סוג ---
      switch (qType) {
        case "single_choice":
          return makeIvrRead("הקש את מספר התשובה", "q_ans", 1, 1, timeLimit);

        case "multiple_correct":
        case "poll":
          return makeIvrRead("הקש את האפשרות שבחרת", "q_ans", 1, 1, timeLimit);

        case "range":
          return makeIvrRead("הקש מספר וסיים בסולמית", "q_range", 1, 6, timeLimit);

        case "true_false":
          return makeIvrRead("ענה נכון או לא נכון הקש 1 לנכון 2 ללא נכון", "q_ans", 1, 1, timeLimit);

        default:
          return makeIvrRead("הקש את מספר התשובה", "q_ans", 1, 1, timeLimit);
      }
    }

    return makeIvrRead("ברוכים הבאים נא להקיש את קוד המשחק בן 6 ספרות", "q_pin", 6, 6);

  } catch (err) {
    console.error("IVR System Error:", err);
    return new Response("id_list_message=f-אירעה שגיאה כללית במערכת", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

function makeIvrRead(text: string, valName: string, minDigits = 1, maxDigits = 1, timeout = 10) {
  const clean = sanitizeText(text);
  return new Response(`read=t-${clean}=${valName},no,${minDigits},${maxDigits},${timeout},Digits,no,no`, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function makeIvrWait(text: string) {
  const clean = sanitizeText(text);
  return new Response(`read=t-${clean}=q_wait,no,1,1,2,Digits,no,no`, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
