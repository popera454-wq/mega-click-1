'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_option: number;
  time_limit: number;
}

interface Player {
  id: string;
  name: string;
  score: number;
  lastAnswerIndex?: number;
  lastAnswerTime?: number;
}

type GameState =
  | 'LOBBY'
  | 'QUESTION'
  | 'SHOW_RESULT'
  | 'LEADERBOARD'
  | 'GAME_OVER';

export default function HostGamePage({
  params,
}: {
  params: { quizId: string };
}) {
  const quizId = params.quizId;
  const router = useRouter();

  // Game Identifiers
  const [pinCode] = useState(() =>
    Math.floor(100000 + Math.random() * 900000).toString()
  );
  const [gameState, setGameState] = useState<GameState>('LOBBY');

  // Data
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);

  // Timer & Answers
  const [timeLeft, setTimeLeft] = useState(20);
  const [answersCount, setAnswersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const channelRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // 1. הטענת מידע על החידון
  useEffect(() => {
    const initHost = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // טעינת שם החידון והשאלות
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('title')
        .eq('id', quizId)
        .single();
      const { data: qData } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: true });

      if (quizData) setQuizTitle(quizData.title);
      if (qData && qData.length > 0) setQuestions(qData);

      setLoading(false);
    };

    initHost();
  }, [quizId, router]);

  // 2. הגדרת ערוץ תקשורת בזמן אמת (Realtime Broadcast & Presence)
  useEffect(() => {
    if (loading || questions.length === 0) return;

    const channel = supabase.channel(`game_${pinCode}`, {
      config: { presence: { key: 'host' } },
    });

    // מעקב אחר שחקנים שמצטרפים
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const joinedPlayers: Player[] = [];

      Object.keys(state).forEach((key) => {
        if (key !== 'host') {
          const presences = state[key] as any[];
          if (presences.length > 0) {
            joinedPlayers.push({
              id: key,
              name: presences[0].name || 'שחקן',
              score: presences[0].score || 0,
            });
          }
        }
      });

      setPlayers((prev) => {
        // שמירת ניקוד קודם של שחקנים קיימים
        return joinedPlayers.map((p) => {
          const existing = prev.find((prevP) => prevP.id === p.id);
          return existing ? { ...p, score: existing.score } : p;
        });
      });
    });

    // קבלת תשובות משחקנים בלייב
    channel.on('broadcast', { event: 'SUBMIT_ANSWER' }, ({ payload }) => {
      const { playerId, answerIndex, timeTaken } = payload;
      const currentQ = questions[currentQuestionIndex];

      setPlayers((prevPlayers) => {
        return prevPlayers.map((p) => {
          if (p.id === playerId) {
            const isCorrect = answerIndex === currentQ.correct_option;
            // חישוב ניקוד: עד 1000 נקודות לפי מהירות התשובה
            const bonus = isCorrect
              ? Math.max(
                  200,
                  Math.round(1000 * (1 - timeTaken / currentQ.time_limit))
                )
              : 0;
            return {
              ...p,
              score: p.score + bonus,
              lastAnswerIndex: answerIndex,
            };
          }
          return p;
        });
      });

      setAnswersCount((prev) => prev + 1);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ role: 'host' });
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pinCode, loading, questions, currentQuestionIndex]);

  // 3. מנגנון טיימר לשאלה
  useEffect(() => {
    if (gameState === 'QUESTION' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'QUESTION') {
      endQuestion();
    }

    return () => clearInterval(timerRef.current);
  }, [gameState, timeLeft]);

  // סיום זמן השאלה או הגשת תשובות מכולם
  useEffect(() => {
    if (
      gameState === 'QUESTION' &&
      players.length > 0 &&
      answersCount >= players.length
    ) {
      endQuestion();
    }
  }, [answersCount, players.length, gameState]);

  // התחלת המשחק
  const startGame = () => {
    if (players.length === 0) {
      alert('יש להמתין לפחות לשחקן אחד לפני התחלת המשחק!');
      return;
    }
    startQuestion(0);
  };

  // התחלת שאלה ספציפית
  const startQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setAnswersCount(0);
    setTimeLeft(questions[index].time_limit || 20);
    setGameState('QUESTION');

    // שידור לכל השחקנים שהשאלה התחילה
    channelRef.current?.send({
      type: 'broadcast',
      event: 'QUESTION_START',
      payload: {
        questionIndex: index,
        questionText: questions[index].question_text,
        options: questions[index].options,
        timeLimit: questions[index].time_limit || 20,
      },
    });
  };

  // סיום שאלה ומעבר למסך תוצאות
  const endQuestion = () => {
    clearInterval(timerRef.current);
    setGameState('SHOW_RESULT');

    const currentQ = questions[currentQuestionIndex];

    channelRef.current?.send({
      type: 'broadcast',
      event: 'QUESTION_END',
      payload: {
        correctOption: currentQ.correct_option,
      },
    });
  };

  // מעבר לטבלת מובילים
  const showLeaderboard = () => {
    setGameState('LEADERBOARD');
  };

  // מעבר לשאלה הבאה או סיום
  const nextQuestion = () => {
    if (currentQuestionIndex + 1 < questions.length) {
      startQuestion(currentQuestionIndex + 1);
    } else {
      setGameState('GAME_OVER');
      channelRef.current?.send({
        type: 'broadcast',
        event: 'GAME_OVER',
        payload: {},
      });
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen grid-bg bg-[#0d041e] text-white flex justify-center items-center dir-rtl">
        <p className="text-white/60 animate-pulse">מכין את קוד המשחק...</p>
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="min-h-screen grid-bg bg-[#0d041e] text-white flex flex-col justify-center items-center gap-4 dir-rtl p-6 text-center">
        <h2 className="text-2xl font-bold">לא נמצאו שאלות בחידון זה!</h2>
        <p className="text-white/60">
          יש להוסיף שאלות בלוח הבקרה לפני הפעלת המשחק.
        </p>
        <Link
          href={`/dashboard/quiz/${quizId}`}
          className="px-6 py-3 rounded-xl bg-fuchsia-500 font-bold"
        >
          חזור לעריכת שאלות
        </Link>
      </main>
    );
  }

  const currentQ = questions[currentQuestionIndex];
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <main className="min-h-screen grid-bg bg-[#0d041e] text-white dir-rtl flex flex-col justify-between p-6 md:p-10 select-none">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-black text-fuchsia-300">{quizTitle}</h1>
          <p className="text-xs text-white/50">מנחה המשחק</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white/10 px-6 py-2 rounded-2xl border border-white/20 text-center">
            <span className="text-xs text-white/60 block">
              קוד הצטרפות PIN:
            </span>
            <span className="text-3xl font-black tracking-widest text-fuchsia-400">
              {pinCode}
            </span>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-white/40 hover:text-white"
          >
            יציאה
          </Link>
        </div>
      </header>

      {/* 1. LOBBY STATE */}
      {gameState === 'LOBBY' && (
        <div className="max-w-4xl mx-auto w-full text-center py-12">
          <h2 className="text-3xl md:text-5xl font-black mb-3">
            היכנסו ל-MegaClick והזינו קוד
          </h2>
          <p className="text-white/60 text-lg mb-8">
            המתינו שהשחקנים יתחברו מהמחשב או הנייד...
          </p>

          {/* Players Grid */}
          <div className="glass rounded-3xl p-8 border border-white/10 min-h-[250px] mb-8 flex flex-wrap gap-4 items-center justify-center">
            {players.length === 0 ? (
              <p className="text-white/40 animate-pulse text-lg">
                מחכה לשחקנים ראשונים...
              </p>
            ) : (
              players.map((p) => (
                <div
                  key={p.id}
                  className="bg-gradient-to-r from-fuchsia-500/20 to-violet-500/20 border border-fuchsia-500/40 px-6 py-3 rounded-2xl font-bold text-lg animate-in zoom-in duration-200"
                >
                  🎮 {p.name}
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between items-center px-4">
            <span className="text-xl font-bold text-fuchsia-300">
              {players.length} שחקנים מחוברים
            </span>
            <button
              onClick={startGame}
              className="px-10 py-4 rounded-2xl font-black text-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 shadow-xl shadow-fuchsia-500/30 transition-all active:scale-95"
            >
              התחל משחק 🚀
            </button>
          </div>
        </div>
      )}

      {/* 2. QUESTION STATE */}
      {gameState === 'QUESTION' && (
        <div className="max-w-5xl mx-auto w-full py-6">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-bold text-fuchsia-300">
              שאלה {currentQuestionIndex + 1} מתוך {questions.length}
            </span>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <span className="text-xs text-white/50 block">תשובות</span>
                <span className="text-2xl font-black">
                  {answersCount} / {players.length}
                </span>
              </div>
              <div className="w-16 h-16 rounded-full bg-fuchsia-500/20 border-2 border-fuchsia-500 flex items-center justify-center text-2xl font-black animate-pulse">
                {timeLeft}
              </div>
            </div>
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-center my-10 leading-snug">
            {currentQ.question_text}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {currentQ.options.map((opt, i) => (
              <div
                key={i}
                className="glass p-6 rounded-2xl font-bold text-xl border border-white/10 flex items-center gap-4"
              >
                <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-sm">
                  {i + 1}
                </span>
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SHOW RESULT STATE */}
      {gameState === 'SHOW_RESULT' && (
        <div className="max-w-4xl mx-auto w-full text-center py-10">
          <h2 className="text-4xl font-black mb-8">התשובה הנכונה היא:</h2>

          <div className="glass p-8 rounded-3xl border-2 border-emerald-500 bg-emerald-500/10 text-3xl font-black text-emerald-300 mb-10">
            {currentQ.options[currentQ.correct_option]}
          </div>

          <button
            onClick={showLeaderboard}
            className="px-10 py-4 rounded-2xl font-black text-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 shadow-xl transition-all"
          >
            הצג טבלת מובילים 🏆
          </button>
        </div>
      )}

      {/* 4. LEADERBOARD STATE */}
      {gameState === 'LEADERBOARD' && (
        <div className="max-w-3xl mx-auto w-full py-6">
          <h2 className="text-4xl font-black text-center mb-8">
            טבלת מובילים 🏆
          </h2>

          <div className="space-y-3 mb-10">
            {sortedPlayers.slice(0, 5).map((p, rank) => (
              <div
                key={p.id}
                className="glass p-4 rounded-2xl border border-white/10 flex items-center justify-between font-bold text-lg"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      rank === 0
                        ? 'bg-amber-400 text-black'
                        : rank === 1
                        ? 'bg-slate-300 text-black'
                        : rank === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-white/10'
                    }`}
                  >
                    {rank + 1}
                  </span>
                  <span>{p.name}</span>
                </div>
                <span className="text-fuchsia-300">{p.score} נק׳</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={nextQuestion}
              className="px-10 py-4 rounded-2xl font-black text-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 shadow-xl transition-all"
            >
              {currentQuestionIndex + 1 < questions.length
                ? 'לשאלה הבאה ➔'
                : 'לסיום המשחק 🎉'}
            </button>
          </div>
        </div>
      )}

      {/* 5. GAME OVER STATE */}
      {gameState === 'GAME_OVER' && (
        <div className="max-w-3xl mx-auto w-full text-center py-12">
          <h2 className="text-5xl font-black mb-4">המנצחים הגדולים! 🎉</h2>

          {sortedPlayers.length > 0 && (
            <div className="glass neon p-8 rounded-3xl border border-fuchsia-500/50 my-8">
              <div className="text-6xl mb-2">🥇</div>
              <h3 className="text-3xl font-black text-fuchsia-300">
                {sortedPlayers[0]?.name}
              </h3>
              <p className="text-2xl font-bold mt-2">
                {sortedPlayers[0]?.score} נקודות
              </p>
            </div>
          )}

          <Link
            href="/dashboard"
            className="inline-block px-10 py-4 rounded-2xl font-black text-xl bg-white/10 hover:bg-white/20 border border-white/20"
          >
            חזרה לדשבורד
          </Link>
        </div>
      )}
    </main>
  );
}
