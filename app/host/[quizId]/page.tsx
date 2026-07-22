"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer_index: number;
  time_limit?: number;
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
}

interface Player {
  phone: string;
  player_name: string;
  score: number;
}

interface Answer {
  phone: string;
  question_index: number;
  answer_index: number;
  score_awarded: number;
}

export default function HostGamePage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const resolvedParams = use(params);
  const quizId = resolvedParams.quizId;
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [gamePin, setGamePin] = useState<string | null>(null);
  const [status, setStatus] = useState<"lobby" | "active" | "showing_results" | "finished">("lobby");
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [loading, setLoading] = useState(true);

  // 1. טעינת השאלון ויצירת המשחק
  useEffect(() => {
    async function initGame() {
      try {
        setLoading(true);

        // שליפת ה-Quiz
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select("*")
          .eq("id", quizId)
          .single();

        if (quizError || !quizData) {
          alert("שאלון לא נמצא");
          router.push("/");
          return;
        }

        setQuiz(quizData);

        // יצירת קוד PIN אקראי בן 6 ספרות
        const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
        setGamePin(generatedPin);

        // שמירת המשחק בטבלת games
        const { error: gameError } = await supabase.from("games").insert({
          pin: generatedPin,
          quiz_id: quizId,
          status: "lobby",
          current_question_index: 0,
        });

        if (gameError) {
          console.error("Error creating game:", gameError);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    }

    initGame();
  }, [quizId, router]);

  // 2. האזנה בזמן אמת לחיבור שחקנים ותשובות (Realtime Subscriptions)
  useEffect(() => {
    if (!gamePin) return;

    // שליפת שחקנים קיימים
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from("game_players")
        .select("*")
        .eq("game_pin", gamePin);
      if (data) setPlayers(data);
    };

    // שליפת תשובות קיימות
    const fetchAnswers = async () => {
      const { data } = await supabase
        .from("game_answers")
        .select("*")
        .eq("game_pin", gamePin);
      if (data) setAnswers(data);
    };

    fetchPlayers();
    fetchAnswers();

    // מאזין לטבלת game_players
    const playerChannel = supabase
      .channel(`host_players_${gamePin}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_players",
          filter: `game_pin=eq.${gamePin}`,
        },
        () => fetchPlayers()
      )
      .subscribe();

    // מאזין לטבלת game_answers
    const answerChannel = supabase
      .channel(`host_answers_${gamePin}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_answers",
          filter: `game_pin=eq.${gamePin}`,
        },
        () => fetchAnswers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playerChannel);
      supabase.removeChannel(answerChannel);
    };
  }, [gamePin]);

  // 3. ניהול טיימר לשאלה הפעילה
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (status === "active" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (status === "active" && timeLeft === 0) {
      handleTimeUp();
    }

    return () => clearInterval(timer);
  }, [status, timeLeft]);

  // תום הזמן לשאלה
  const handleTimeUp = async () => {
    setStatus("showing_results");
    if (!gamePin) return;

    await supabase
      .from("games")
      .update({ status: "showing_results" })
      .eq("pin", gamePin);
  };

  // התחלת המשחק / מעבר לשאלה הבאה
  const handleStartOrNext = async () => {
    if (!quiz || !gamePin) return;

    if (status === "lobby") {
      // התחלת שאלה ראשונה
      setCurrentQIndex(0);
      setTimeLeft(30);
      setStatus("active");

      await supabase
        .from("games")
        .update({
          status: "active",
          current_question_index: 0,
          question_start_time: new Date().toISOString(),
        })
        .eq("pin", gamePin);
    } else if (status === "showing_results") {
      const nextIndex = currentQIndex + 1;

      if (nextIndex < quiz.questions.length) {
        // מעבר לשאלה הבאה
        setCurrentQIndex(nextIndex);
        setTimeLeft(30);
        setStatus("active");

        await supabase
          .from("games")
          .update({
            status: "active",
            current_question_index: nextIndex,
            question_start_time: new Date().toISOString(),
          })
          .eq("pin", gamePin);
      } else {
        // סיום המשחק
        setStatus("finished");

        await supabase
          .from("games")
          .update({ status: "finished" })
          .eq("pin", gamePin);

        // הפיכת ה-IVR Sessions ל-FINISHED
        await supabase
          .from("ivr_sessions")
          .update({ status: "FINISHED" })
          .eq("pin", gamePin);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-sans dir-rtl">
        <h2 className="text-2xl animate-pulse">טוען את המשחק...</h2>
      </div>
    );
  }

  const currentQuestion = quiz?.questions[currentQIndex];

  // חישוב התשובות לשאלה הנוכחית
  const currentAnswers = answers.filter((a) => a.question_index === currentQIndex);

  // חישוב לוח מובילים (Leaderboard)
  const calculateLeaderboard = () => {
    return players
      .map((player) => {
        let totalScore = 0;
        answers.forEach((ans) => {
          if (ans.phone === player.phone) {
            const q = quiz?.questions[ans.question_index];
            if (q && ans.answer_index === q.correct_answer_index) {
              totalScore += ans.score_awarded || 1000;
            }
          }
        });
        return { ...player, totalScore };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 dir-rtl flex flex-col justify-between font-sans">
      {/* כותרת עליונה */}
      <header className="flex justify-between items-center border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold">{quiz?.title}</h1>
          <p className="text-slate-400 text-sm">
            {status === "lobby"
              ? "ממתין לשחקנים"
              : status === "finished"
              ? "המשחק הסתיים"
              : `שאלה ${currentQIndex + 1} מתוך ${quiz?.questions.length}`}
          </p>
        </div>

        {/* PIN קוד המשחק */}
        <div className="bg-indigo-600 px-6 py-2 rounded-xl font-mono text-center">
          <span className="text-xs text-indigo-200 block uppercase">קוד התחברות בטלפון</span>
          <span className="text-3xl font-black tracking-wider">{gamePin}</span>
        </div>
      </header>

      {/* 1. מסך ממתין (Lobby) */}
      {status === "lobby" && (
        <main className="flex-1 flex flex-col items-center justify-center my-8 text-center">
          <h2 className="text-4xl font-extrabold mb-4">חייגו והקישו את הקוד כדי להצטרף</h2>
          <p className="text-slate-300 text-lg mb-8">מספר שחקנים שהתחברו: <span className="font-bold text-yellow-400">{players.length}</span></p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl max-h-64 overflow-y-auto p-4 bg-slate-800 rounded-2xl">
            {players.length === 0 ? (
              <p className="col-span-full text-slate-500 py-8">טרם התחברו שחקנים...</p>
            ) : (
              players.map((p, idx) => (
                <div key={idx} className="bg-slate-700 p-3 rounded-xl font-medium border border-slate-600">
                  📞 {p.player_name}
                </div>
              ))
            )}
          </div>
        </main>
      )}

      {/* 2. מסך שאלה פעילה (Active Question) */}
      {status === "active" && currentQuestion && (
        <main className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full my-6">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xl bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
              תשובות שנתקבלו: <strong className="text-emerald-400">{currentAnswers.length}</strong> / {players.length}
            </span>
            <span className={`text-3xl font-mono font-bold px-4 py-2 rounded-full ${timeLeft <= 5 ? "bg-red-600 animate-ping" : "bg-indigo-600"}`}>
              ⏱️ {timeLeft}
            </span>
          </div>

          <div className="bg-slate-800 p-8 rounded-2xl shadow-xl mb-8 border border-slate-700">
            <h2 className="text-3xl font-bold leading-snug">{currentQuestion.question_text}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion.options.map((opt, idx) => (
              <div key={idx} className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex items-center text-lg">
                <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold ml-3">
                  {idx + 1}
                </span>
                {opt}
              </div>
            ))}
          </div>
        </main>
      )}

      {/* 3. מסך תוצאות שאלה (Showing Results) */}
      {status === "showing_results" && currentQuestion && (
        <main className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full my-6">
          <h2 className="text-2xl font-bold mb-4 text-center text-emerald-400">התשובה הנכונה היא: option {currentQuestion.correct_answer_index + 1}</h2>

          <div className="bg-slate-800 p-6 rounded-2xl mb-6 border border-slate-700">
            <h3 className="text-lg font-bold mb-3 text-slate-300">תשובה נכונה: {currentQuestion.options[currentQuestion.correct_answer_index]}</h3>
            <p className="text-slate-400">ענו כהלכה בשאלה זו: {currentAnswers.filter(a => a.answer_index === currentQuestion.correct_answer_index).length} שחקנים</p>
          </div>

          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <h3 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">🏆 מובילים נוכחיים:</h3>
            <div className="space-y-2">
              {calculateLeaderboard().slice(0, 5).map((p, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-700 p-3 rounded-lg">
                  <span>{idx + 1}. {p.player_name}</span>
                  <span className="font-bold text-yellow-400">{p.totalScore} נק'</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* 4. מסך סיום המשחק (Finished) */}
      {status === "finished" && (
        <main className="flex-1 flex flex-col items-center justify-center my-8 text-center max-w-2xl mx-auto w-full">
          <h2 className="text-5xl font-extrabold text-yellow-400 mb-6">🏆 המשחק הסתיים!</h2>
          <div className="bg-slate-800 p-6 rounded-2xl w-full border border-slate-700">
            <h3 className="text-2xl font-bold mb-4">טבלת המנצחים הסופית:</h3>
            <div className="space-y-3">
              {calculateLeaderboard().map((p, idx) => (
                <div key={idx} className={`flex justify-between items-center p-4 rounded-xl ${idx === 0 ? "bg-amber-500 text-slate-900 font-bold text-xl" : "bg-slate-700"}`}>
                  <span>{idx + 1}. {p.player_name}</span>
                  <span>{p.totalScore} נקודות</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* סרגל כפתורי תפעול חברתי/ניהול */}
      <footer className="pt-4 border-t border-slate-800 flex justify-end">
        {status === "lobby" && (
          <button
            onClick={handleStartOrNext}
            disabled={players.length === 0}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xl px-8 py-3 rounded-xl transition"
          >
            התחל משחק 🚀
          </button>
        )}

        {status === "active" && (
          <button
            onClick={handleTimeUp}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-3 rounded-xl transition"
          >
            עצור שאלה והצג תוצאות ⏹️
          </button>
        )}

        {status === "showing_results" && (
          <button
            onClick={handleStartOrNext}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xl px-8 py-3 rounded-xl transition"
          >
            {currentQIndex + 1 < (quiz?.questions.length || 0) ? "לשאלה הבאה ➡️" : "לתוצאות הסופיות 🏆"}
          </button>
        )}

        {status === "finished" && (
          <button
            onClick={() => router.push("/")}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-6 py-3 rounded-xl transition"
          >
            חזרה לדף הבית
          </button>
        )}
      </footer>
    </div>
  );
}
