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
    
    // שליפת משתנים מתוך ה-URL (עבור בקשות GET)
    let apiPhone = url.searchParams.get("ApiPhone") || url.searchParams.get("api_phone") || url.searchParams.get("phone") || url.searchParams.get("ApiDID") || "";
    let inputPin = url.searchParams.get("q_pin") || url.searchParams.get("val_name_q_pin") || url.searchParams.get("api_val_name_q_pin") || "";
    let inputAns = url.searchParams.get("q_ans") || url.searchParams.get("val_name_q_ans") || url.searchParams.get("api_val_name_q_ans") || "";
    let inputRange = url.searchParams.get("q_range") || url.searchParams.get("val_name_q_range") || url.searchParams.get("api_val_name_q_range") || "";

    // אם מדובר בבקשת POST, ננסה לשלוף את הפרמטרים מתוך ה-Body (הפורמט שימות המשיח שולחת)
    if (req.method === "POST") {
      try {
        const contentType = req.headers.get("content-type") || "";
        if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
          const formData = await req.formData();
          apiPhone = formData.get("ApiPhone")?.toString() || formData.get("api_phone")?.toString() || formData.get("phone")?.toString() || formData.get("ApiDID")?.toString() || apiPhone;
          inputPin = formData.get("q_pin")?.toString() || formData.get("val_name_q_pin")?.toString() || formData.get("api_val_name_q_pin")?.toString() || inputPin;
          inputAns = formData.get("q_ans")?.toString() || formData.get("val_name_q_ans")?.toString() || formData.get("api_val_name_q_ans")?.toString() || inputAns;
          inputRange = formData.get("q_range")?.toString() || formData.get("val_name_q_range")?.toString() || formData.get("api_val_name_q_range")?.toString() || inputRange;
        } else {
          const json = await req.json();
          apiPhone = json.ApiPhone || json.api_phone || json.phone || json.ApiDID || apiPhone;
          inputPin = json.q_pin || json.val_name_q_pin || json.api_val_name_q_pin || inputPin;
          inputAns = json.q_ans || json.val_name_q_ans || json.api_val_name_q_ans || inputAns;
          inputRange = json.q_range || json.val_name_q_range || json.api_val_name_q_range || inputRange;
        }
      } catch (e) {
        // אם ה-Body ריק או בפורמט לא מוכר, נמשיך עם מה שנתפס ב-URL
      }
    }

    const phone = cleanPhone(apiPhone);
    inputPin = String(inputPin).trim();
    inputAns = String(inputAns).trim();
    inputRange = String(inputRange).trim();

    // הגנה קריטית: אם אין מספר טלפון, נחזיר הודעה ברורה
    if (!phone) {
      return new Response("id_list_message=f-שגיאה בזיהוי מספר הטלפון", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // 2. שליפת סשן באופן בטוח
    let session = null;
    try {
      const { data } = await supabase
        .from("ivr_sessions")
        .select("pin, status")
        .eq("phone", phone)
        .maybeSingle();
      session = data;
    } catch (e) {
      console.error("Supabase Session Fetch Error:", e);
      return new Response("id_list_message=f-שגיאה בחיבור לבסיס הנתונים", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const activePin = session?.pin ? String(session.pin) : null;

    // 3. הרשמה / התחברות למשחק
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

    // 4. ניהול שיחה למשתמש מחובר
    if (activePin) {
      const { data: gameData } = await supabase
        .from("games")
        .select("current_question_index, question_start_time, status")
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

        let answerIndex: number | null = null;
        let answerValue: string | null = null;

        if (qType === "range") {
          answerValue = String(submittedAnswer);
        } else {
          const numericAns = parseInt(submittedAnswer, 10);
          if (!isNaN(numericAns)) answerIndex = numericAns - 1;
        }

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

        return makeIvrWait("התשובה נקלטה. המתן לשאלה הבאה");
      }

      if (existingAnswer) {
        return makeIvrWait("ממתין לשאלה הבאה");
      }

      if (qType === "range") {
        return makeIvrRead("שאלת טווח. הקש מספר וסיום בסולמית", "q_range", digitsMin, digitsMax, timeLimit);
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
  const responseText = `read=t-${text}=${valName},no,${minDigits},${maxDigits},${timeout},Digits,no,no`;
  return new Response(responseText, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function makeIvrWait(text: string) {
  const responseText = `read=t-${text}=q_wait,no,1,1,2,Digits,no,no`;
  return new Response(responseText, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
