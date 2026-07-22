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
      return sendIvrResponse("read=t-שָׁלוֹם. הַקֵּשׁ אֶת קוֹד הַמִּשְׂחָק בְּשֵׁשׁ סְפָרוֹת=q_pin,no,6,6,10,Digits,no,no,");
    }

    const { data: session } = await supabase
      .from("ivr_sessions")
      .select("pin, status")
      .eq("phone", phone)
      .maybeSingle();

    if (session?.status === "FINISHED") {
      await supabase.from("ivr_sessions").delete().eq("phone", phone);
      return sendIvrResponse("id_list_message=t-הַמִּשְׂחָק הִסְתַּיֵּם. תּוֹדָה שֶׁשִּׂחַקְתֶּם&go_to_folder=hangup");
    }

    const activePin = session?.pin ? String(session.pin) : null;

    // === מקרה א': כניסה למשחק חדש לפי PIN ===
    if ((inputPin && inputPin !== activePin) || (!activePin && inputPin)) {
      if (!/^\d{6}$/.test(inputPin)) {
        return sendIvrResponse("read=t-קֹוד לֹא תַּקִּינ. הַקֵּשׁ קֹוד בֶּן שֵׁשׁ סְפָרוֹת=q_pin,no,6,6,10,Digits,no,no,");
      }

      const { data: rawGames } = await supabase
        .from("games")
        .select("id, pin, status");

      const validGame = rawGames?.find(
        (g) => String(g.pin).trim() === inputPin && String(g.status).toLowerCase() !== "finished"
      );

      if (!validGame) {
        return sendIvrResponse("read=t-מִשְׂחָק לֹא קַיָּם אוֹ שֶׁהִסְתַּיֵּם. נַסֵּה שׁוּב=q_pin,no,6,6,10,Digits,no,no,");
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

      return sendIvrResponse("id_list_message=t-הִתְחַבַּרְתָּ בְּהַצְלָחָה. הַמְתֵּן לַשְּׁאֵלָה הַבָּאָה");
    }

    // === מקרה ב': משתמש מחובר פעיל ===
    if (activePin) {
      // שליפת מצב המשחק הנוכחי והשאלה הנוכחית
      const { data: gameData } = await supabase
        .from("games")
        .select("current_question_index, question_start_time, status")
        .eq("pin", activePin)
        .maybeSingle();

      if (!gameData || String(gameData.status).toLowerCase() === "finished") {
        await supabase.from("ivr_sessions").delete().eq("phone", phone);
        return sendIvrResponse("id_list_message=t-הַמִּשְׂחָק הִסְתַּיֵּם. תּוֹדָה רַבָּה&go_to_folder=hangup");
      }

      const currentQIndex = gameData.current_question_index ?? 0;

      // שליפת פרטי הששאלה הספציפית כדי לדעת את סוגה
      const { data: questionData } = await supabase
        .from("questions")
        .select("question_type, question_text, options")
        .eq("game_pin", activePin)
        .eq("question_index", currentQIndex)
        .maybeSingle();

      const qType = questionData?.question_type || "single_choice";

      // טיפול בקלט תשובה שהגיע מהמשתמש (תמיכה גם בבחירה רגילה וגם בטווח)
      const submittedAnswer = qType === "range" ? inputRange : inputAns;

      if (submittedAnswer) {
        // חישוב בונוס מהירות
        let timeBonus = 1000;
        if (gameData?.question_start_time) {
          const startTime = new Date(gameData.question_start_time).getTime();
          const elapsedSeconds = Math.max(0, (Date.now() - startTime) / 1000);
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

        // שמירת התשובה בבסיס הנתונים
        await supabase.from("game_answers").upsert(
          {
            game_pin: activePin,
            phone: phone,
            question_index: currentQIndex,
            answer_index: answerIndex,
            answer_value: answerValue,
            score_awarded: timeBonus,
            created_at: new Date().toISOString(),
          },
          { onConflict: "game_pin,phone,question_index" }
        );

        return sendIvrResponse("id_list_message=t-הַתְּשׁוּבָה נִקְלְטָה. הַמְתֵּן לַשְּׁאֵלָה הַבָּאָה");
      }

      // בדיקה האם השחקן כבר ענה על השאלה הנוכחית
      const { data: existingAnswer } = await supabase
        .from("game_answers")
        .select("question_index")
        .eq("game_pin", activePin)
        .eq("phone", phone)
        .eq("question_index", currentQIndex)
        .maybeSingle();

      if (existingAnswer) {
        // אם כבר ענה, רק נשמור אותו במצב המתנה בלי לחפור לו
        return sendIvrResponse("id_list_message=t-הַתְּשׁוּבָה כְּבָר נִקְלְטָה. הַמְתֵּן לַשְּׁאֵלָה הַבָּאָה");
      }

      // אם טרם ענה - נציג לו את השאלה בהתאם לסוג שלה מבלי לדרוש אישור מיותר (לחיצה מיידית)
      if (qType === "range") {
        return sendIvrResponse("read=t-הַקֵּשׁ אֶת הַמִּסְפָּר הָרָצוּי וְסַיֵּם בְּסֻלְמִית=q_range,no,1,6,10,Digits,no,no,");
      } else if (qType === "poll") {
        return sendIvrResponse("read=t-שְׁאֵלַת סֶקֶר. הַקֵּשׁ אֶת מִסְפַּר הַתְּשׁוּבָה=q_ans,no,1,1,10,Digits,no,no,");
      } else {
        // ברירת מחדל: שאלה רגילה / אמריקאית (קולט ספרה 1 בלבד ושולח מיד!)
        return sendIvrResponse("read=t-הַקֵּשׁ אֶת מִסְפַּר הַתְּשׁוּבָה מֵאַחַת עַד אַרְבַּע=q_ans,no,1,1,10,Digits,no,no,");
      }
    }

    return sendIvrResponse("read=t-בְּרוּכִים הַבָּאִים. הַקֵּשׁ אֶת קוֹד הַמִּשְׂחָק בְּשֵׁשׁ סְפָרוֹת=q_pin,no,6,6,10,Digits,no,no,");
  } catch (err) {
    console.error("IVR Error:", err);
    return sendIvrResponse("read=t-אִירְעָה שְׁגִיאָה. הַקֵּשׁ אֶת קוֹד הַמִּשְׂחָק=q_pin,no,6,6,10,Digits,no,no,");
  }
}

function sendIvrResponse(text: string) {
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
