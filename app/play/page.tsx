"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Question {
  question_text: string;
  options: string[];
}

export default function PlayPage() {
  // מצבי הצטרפות
  const [pin, setPin] = useState("");
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(false);

  // מצבי משחק
  const [gameStatus, setGameStatus] = useState<string>("lobby");
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 1. התחברות למשחק (Join Game)
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const cleanPin = pin.trim();
    const cleanName = nickname.trim();

    if (!cleanPin || cleanPin.length !== 6) {
      setErrorMessage("יש להזין קוד משחק בן 6 ספרות");
      return;
    }

    if (!cleanName) {
      setErrorMessage("יש להזין שם תצוגה");
      return;
    }

    try {
      setLoading(true);

      // 1. אימות שהמשחק קיים ופעיל
      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .select("*, quizzes(questions)")
        .eq("pin", cleanPin)
        .neq("status", "finished")
        .maybeSingle();

      if (gameError || !gameData) {
        setErrorMessage("המשחק לא נמצא או שהסתיים");
        return;
      }

      // שמירת השאלות ומצב המשחק
      if (gameData.quizzes?.questions) {
        setQuestions(gameData.quizzes.questions);
      }
      setGameStatus(gameData.status || "lobby");
      setCurrentQIndex(gameData.current_question_index || 0);

      // 2. הרשמת השחקן בטבלת game_players
      const { error: playerError } = await supabase.from("game_players").upsert(
        {
          game_pin: cleanPin,
          phone: `web_${cleanName}_${Date.now().toString().slice(-4)}`, // מזהה ייחודי למשתמש רשת
          player_name: cleanName,
          score: 0,
        },
        { onConflict: "game_pin,phone" }
      );

      if (playerError) {
        console.error("Player join error:", playerError);
      }

      setJoined(true);
    } catch (err) {
      console.error("Unexpected error:", err);
      setErrorMessage("אירעה שגיאה בחיבור למשחק");
    } finally {
      setLoading(false);
    }
  };

  // 2. האזנה בזמן אמת לשינויים בסטטוס המשחק (Realtime Subscription)
  useEffect(() => {
    if (!joined || !pin) return;

    const gameChannel = supabase
      .channel(`web_play_${pin}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `pin=eq.${pin}`,
        },
        (payload) => {
          const updatedGame = payload.new;
          
          // אם האינדקס של השאלה השתנה - איפוס בחירת התשובה לשאלה החדשה
          if (updatedGame.current_question_index !== currentQIndex) {
            setSelectedAnswer(null);
            setHasAnswered(false);
            setCurrentQIndex(updatedGame.current_question_index);
          }

          setGameStatus(updatedGame.status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [joined, pin, currentQIndex]);

  // 3. שליחת תשובה
  const handleSelectAnswer = async (index: number) => {
    if (hasAnswered || gameStatus !== "active") return;

    setSelectedAnswer(index);
    setHasAnswered(true);

    try {
      // שליפת נתוני הזמן של השאלה לחישוב הבונוס
      const { data: gameData } = await supabase
        .from("games")
        .select("question_start_time")
        .eq("pin", pin)
        .maybeSingle();

      let timeBonus = 1000;
      if (gameData?.question_start_time) {
        const startTime = new Date(gameData.question_start_time).getTime();
        const elapsedSeconds = Math.max(0, (Date.now() - startTime) / 1000);
        const timeLimit = 30;
        const scoreFactor = Math.max(0, (timeLimit - elapsedSeconds) / timeLimit);
        timeBonus = Math.round(500 + 500 * scoreFactor);
      }

      // שמירת התשובה ב-game_answers
      await supabase.from("game_answers").upsert(
        {
          game_pin: pin,
          phone: `web_${nickname}`,
          question_index: currentQIndex,
          answer_index: index,
          score_awarded: timeBonus,
          created_at: new Date().toISOString(),
        },
        { onConflict: "game_pin,phone,question_index" }
      );
    } catch (err) {
      console.error("Error submitting answer:", err);
    }
  };

  // --- תצוגת מסך כניסה (קוד PIN ושם) ---
  if (!joined) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 dir-rtl font-sans">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
          <h1 className="text-3xl font-black text-center mb-2 text-indigo-400">הצטרפות למשחק</h1>
          <p className="text-slate-400 text-center mb-6 text-sm">הזן את קוד המשחק בן 6 הספרות והשם שלך</p>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 text-sm p-3 rounded-xl mb-4 text-center">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">קוד משחק (PIN)</label>
              <input
                type="text"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="123456"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-center text-2xl font-mono tracking-widest text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">השם שלך</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="הכנס שם..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-right text-lg text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg disabled:opacity-50 mt-2 text-lg"
            >
              {loading ? "מתחבר..." : "הכנס למשחק 🚀"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQIndex];

  // --- תצוגת משחק פעיל ---
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 dir-rtl font-sans">
      {/* סרגל עליון */}
      <header className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
        <div>
          <span className="text-xs text-slate-400 block">שחקן:</span>
          <span className="font-bold text-indigo-300">{nickname}</span>
        </div>
        <div className="text-left">
          <span className="text-xs text-slate-400 block">קוד משחק:</span>
          <span className="font-mono font-bold text-yellow-400">{pin}</span>
        </div>
      </header>

      {/* 1. ממתין להתחלת המשחק (Lobby) */}
      {gameStatus === "lobby" && (
        <main className="flex-1 flex flex-col items-center justify-center text-center my-8">
          <div className="text-6xl mb-4 animate-bounce">🎮</div>
          <h2 className="text-2xl font-bold mb-2">אתה בפנים!</h2>
          <p className="text-slate-400">המנחה יתחיל את המשחק מיד, הביטו במסך הראשי...</p>
        </main>
      )}

      {/* 2. שאלה פעילה (Active Question) */}
      {gameStatus === "active" && currentQuestion && (
        <main className="flex-1 flex flex-col justify-center my-6 max-w-lg mx-auto w-full">
          <div className="text-center mb-6">
            <span className="text-xs uppercase bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded-full border border-indigo-700">
              שאלה {currentQIndex + 1} מתוך {questions.length}
            </span>
            <h2 className="text-xl font-bold mt-4 leading-relaxed">{currentQuestion.question_text}</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = selectedAnswer === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(idx)}
                  disabled={hasAnswered}
                  className={`p-4 rounded-xl border font-bold text-right transition flex items-center justify-between ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-400 text-white shadow-lg scale-[1.02]"
                      : hasAnswered
                      ? "bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 active:scale-95"
                  }`}
                >
                  <span>{opt}</span>
                  <span className="w-7 h-7 rounded-full bg-slate-900/40 flex items-center justify-center text-xs text-slate-300 font-mono">
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>

          {hasAnswered && (
            <div className="mt-6 text-center text-emerald-400 font-medium bg-emerald-900/20 border border-emerald-800/50 p-3 rounded-xl animate-fade-in">
              ✓ התשובה נקלטה! ממתין לתוצאות...
            </div>
          )}
        </main>
      )}

      {/* 3. תוצאות שאלה ביניים (Showing Results) */}
      {gameStatus === "showing_results" && (
        <main className="flex-1 flex flex-col items-center justify-center text-center my-8">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-2xl font-bold mb-2">זמן השאלה הסתיים</h2>
          <p className="text-slate-400">הביטו במסך המנחה ללוח המובילים ולתשובה הנכונה!</p>
        </main>
      )}

      {/* 4. המשחק הסתיים (Finished) */}
      {gameStatus === "finished" && (
        <main className="flex-1 flex flex-col items-center justify-center text-center my-8">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-3xl font-extrabold text-yellow-400 mb-2">תודה ששיחקת!</h2>
          <p className="text-slate-300">המשחק הגיע לסיומו. בדקו את מיקומכם בלוח המובילים במסך הראשי.</p>
        </main>
      )}

      {/* תחתית - סטטוס סנכרון */}
      <footer className="text-center text-slate-500 text-xs py-2 border-t border-slate-800">
        מחובר למשחק {pin} בזמן אמת ⚡
      </footer>
    </div>
  );
}
