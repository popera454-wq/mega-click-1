import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handleRequest(req);
}

export async function POST(req: Request) {
  return handleRequest(req);
}

async function handleRequest(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const phone = String(searchParams.get("ApiPhone") || searchParams.get("phone") || "").trim();
    const inputPin = String(searchParams.get("q_pin") || searchParams.get("val_name_q_pin") || "").trim();
    const inputAns = String(searchParams.get("q_ans") || searchParams.get("val_name_q_ans") || "").trim();
    const currentQ = parseInt(searchParams.get("q_num") || "0", 10);

    // 1. בדיקת קיום מספר טלפון בשיחה
    if (!phone) {
      return sendIvrResponse("read=t-שלום הקש את קוד המשחק=q_pin,no,6,6,10,Digits,no,no,");
    }

    // 2. קבלת PIN חדש והחלפת סשן (הקשת קוד משחק)
    if (inputPin) {
      if (!/^\d{6}$/.test(inputPin)) {
        return sendIvrResponse("read=t-קוד לא תקין הקש שוב=q_pin,no,6,6,10,Digits,no,no,");
      }

      // שמירה/איפוס בטבלת ivr_sessions
      await supabase.from("ivr_sessions").upsert(
        { phone, pin: inputPin, updated_at: new Date().toISOString() },
        { onConflict: "phone" }
      );

      // הרשמת השחקן בטבלת game_players
      await supabase.from("game_players").upsert(
        {
          game_pin: inputPin,
          phone: phone,
          player_name: `טלפון ${phone.slice(-4)}`
        },
        { onConflict: "game_pin,phone" }
      );

      return sendIvrResponse("read=t-התחברת בהצלחה הקש את מספר התשובה=q_ans,no,1,1,15,Digits,no,no,");
    }

    // 3. בדיקת סשן קיים ואימות שהמשחק עדיין אקטיבי
    const { data: session } = await supabase
      .from("ivr_sessions")
      .select("pin")
      .eq("phone", phone)
      .maybeSingle();

    if (!session?.pin) {
      return sendIvrResponse("read=t-ברוכים הבאים הקש את קוד המשחק=q_pin,no,6,6,10,Digits,no,no,");
    }

    // אימות מול game_players לזיהוי משחק שנסגר
    const { data: activePlayer } = await supabase
      .from("game_players")
      .select("id")
      .eq("game_pin", String(session.pin))
      .eq("phone", phone)
      .maybeSingle();

    if (!activePlayer) {
      // המשחק הקודם הסתיים/נמחק - מוחקים את הסשן הישן ומבקשים PIN חדש
      await supabase.from("ivr_sessions").delete().eq("phone", phone);
      return sendIvrResponse("read=t-המשחק הקודם הסתיים הקש קוד משחק חדש=q_pin,no,6,6,10,Digits,no,no,");
    }

    // 4. קבלת תשובה לשאלה
    if (!inputAns) {
      return sendIvrResponse("read=t-הקש את מספר התשובה=q_ans,no,1,1,15,Digits,no,no,");
    }

    const numericAns = parseInt(inputAns, 10);
    if (isNaN(numericAns) || numericAns < 1 || numericAns > 4) {
      return sendIvrResponse("read=t-תשובה לא תקינה הקש בין אחת לארבע=q_ans,no,1,1,15,Digits,no,no,");
    }

    // שמירת התשובה ב-game_answers (המרה לאינדקס 0-3)
    const { error: ansErr } = await supabase.from("game_answers").insert({
      game_pin: String(session.pin),
      phone: phone,
      answer_index: numericAns - 1,
      question_index: currentQ
    });

    if (ansErr) {
      console.error("שגיאה ברישום תשובה קולית:", ansErr);
    }

    return sendIvrResponse("read=t-התשובה נקלטה לשאלה הבאה הקש שוב=q_ans,no,1,1,15,Digits,no,no,");

  } catch (err) {
    console.error("שגיאה כללית ב-IVR:", err);
    return sendIvrResponse("read=t-אירעה שגיאה הקש קוד משחק=q_pin,no,6,6,10,Digits,no,no,");
  }
}

function sendIvrResponse(text: string) {
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
