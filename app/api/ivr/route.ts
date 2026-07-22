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
    
    // 1. חילוץ הפרמטרים מימות המשיח
    const phone = searchParams.get("ApiPhone") || searchParams.get("phone") || "";
    const inputPin = searchParams.get("q_pin") || searchParams.get("val_name_q_pin") || "";
    const inputAns = searchParams.get("q_ans") || searchParams.get("val_name_q_ans") || "";

    // אם אין טלפון (קריאת סריקה וכד')
    if (!phone) {
      return sendIvrResponse("read=t-שלום הקש את קוד המשחק=q_pin,no,6,6,10,Digits,no,no,");
    }

    // 2. המשתמש הקיש PIN
    if (inputPin) {
      if (!/^\d{6}$/.test(inputPin)) {
        return sendIvrResponse("read=t-קוד לא תקין הקש שוב=q_pin,no,6,6,10,Digits,no,no,");
      }

      // שמירה ב-Supabase
      await supabase.from("ivr_sessions").upsert({ phone, pin: inputPin }, { onConflict: "phone" });
      await supabase.from("game_players").upsert(
        { game_pin: inputPin, phone, player_name: `משתתף ${phone.slice(-4)}` },
        { onConflict: "game_pin,phone" }
      );

      return sendIvrResponse("read=t-התחברת בהצלחה הקש את מספר התשובה=q_ans,no,1,1,15,Digits,no,no,");
    }

    // 3. בדיקת סשן קיים
    const { data: session } = await supabase
      .from("ivr_sessions")
      .select("pin")
      .eq("phone", phone)
      .maybeSingle();

    if (!session?.pin) {
      return sendIvrResponse("read=t-ברוכים הבאים הקש את קוד המשחק=q_pin,no,6,6,10,Digits,no,no,");
    }

    // 4. בדיקת תשובה
    if (!inputAns) {
      return sendIvrResponse("read=t-הקש את מספר התשובה=q_ans,no,1,1,15,Digits,no,no,");
    }

    const numericAns = parseInt(inputAns, 10);
    if (isNaN(numericAns) || numericAns < 1 || numericAns > 4) {
      return sendIvrResponse("read=t-תשובה לא תקינה הקש בין אחת לארבע=q_ans,no,1,1,15,Digits,no,no,");
    }

    // שמירת תשובה
    await supabase.from("game_answers").insert({
      game_pin: session.pin,
      phone,
      answer_index: numericAns - 1,
    });

    return sendIvrResponse("read=t-התשובה נקלטה לשאלה הבאה הקש שוב=q_ans,no,1,1,15,Digits,no,no,");

  } catch (err) {
    return sendIvrResponse("read=t-אירעה שגיאה הקש קוד משחק=q_pin,no,6,6,10,Digits,no,no,");
  }
}

function sendIvrResponse(text: string) {
  return new Response(text, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
