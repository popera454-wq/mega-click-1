'use client';

import React, { useState, useEffect, useRef, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  phone: string;
  lastAnswerIndex?: number;
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
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = use(params);
  const router = useRouter();

  const [pinCode] = useState(() =>
    Math.floor(100000 + Math.random() * 900000).toString()
  );
  const [gameState, setGameState] = useState<GameState>('LOBBY');

  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);

  const [timeLeft, setTimeLeft] = useState(20);
  const [answersCount, setAnswersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. טעינת נתונים ראשונית של השאלון והשאלות
  useEffect(() => {
    const initHost = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('title')
          .eq('id', quizId)
          .single();

        if (quizError) {
          console.error('שגיאה בטעינת השאלון:', quizError);
        }

        const { data: qData, error: qError } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('created_at', { ascending: true });

        if (qError) {
          console.error('שגיאה בטעינת השאלות:', qError);
        }

        if (quizData) setQuizTitle(quizData.title);
        if (qData && qData.length > 0) setQuestions(qData);
      } catch (err) {
        console.error('שגיאה כללית בטעינת הנתונים:', err);
      } finally {
        setLoading(false);
      }
    };

    initHost();
  }, [quizId, router]);

  // 2. טעינת שחקנים מ-game_players
  const fetchDbPlayers = useCallback(async () => {
    const { data, error } = await supabase
      .from('game_players')
      .select('*')
      .eq('game_pin', String(pinCode));

    if (error) {
      console.error('שגיאה בטעינת שחקנים:', error);
      return;
    }

    if (data) {
      setPlayers((prev) => {
        return data.map((dbP) => {
          const playerPhone = String(dbP.phone || dbP.id);
          const existing = prev.find(
            (p) => p.phone === playerPhone || p.id === dbP.id
          );
          return {
            id: dbP.id || playerPhone,
            phone: playerPhone,
            name: dbP.player_name || `שחקן ${playerPhone.slice(-4)}`,
            score: existing ? existing.score : 0,
            lastAnswerIndex: existing ? existing.lastAnswerIndex : undefined,
          };
        });
      });
    }
  }, [pinCode]);

  // 3. חישוב ניקוד אחיד
  const handleAnswerSubmitted = useCallback(
    (identifier: string, answerIndex: number, timeTaken: number) => {
      const currentQ = questions[currentQuestionIndex];
      if (!currentQ) return;

      const cleanId = identifier.replace(/\D/g, '');

      setPlayers((prevPlayers) => {
        let isNewAnswer = false;

        const updated = prevPlayers.map((p) => {
          const cleanPlayerPhone = p.phone.replace(/\D/g, '');

          const match =
            p.id === identifier ||
            p.phone === identifier ||
            (cleanId.length > 3 &&
              cleanPlayerPhone.length > 3 &&
              (cleanId.endsWith(cleanPlayerPhone) ||
                cleanPlayerPhone.endsWith(cleanId)));

          if (match) {
            if (p.lastAnswerIndex !== undefined) return p;

            isNewAnswer = true;
            const isCorrect = answerIndex === currentQ.correct_option;
            const bonus = isCorrect
              ? Math.max(
                  200,
                  Math.round(
                    1000 * (1 - timeTaken / (currentQ.time_limit || 20))
                  )
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

        if (isNewAnswer) {
          setAnswersCount((prev) => prev + 1);
        }

        return updated;
      });
    },
    [questions, currentQuestionIndex]
  );

  // 4. סריקה אקטיבית של תשובות ב-DB
  const checkPhoneAnswers = useCallback(async () => {
    if (gameState !== 'QUESTION') return;

    const { data, error } = await supabase
      .from('game_answers')
      .select('*')
      .eq('game_pin', String(pinCode))
      .eq('question_index', currentQuestionIndex);

    if (error) {
      console.error('שגיאה בטעינת תשובות:', error);
      return;
    }

    if (data && data.length > 0) {
      data.forEach((ans) => {
        handleAnswerSubmitted(String(ans.phone), ans.answer_index, 5);
      });
    }
  }, [gameState, pinCode, currentQuestionIndex, handleAnswerSubmitted]);

  // 5. סנכרון תקופתי וחיבור Realtime
  useEffect(() => {
    if (loading) return;

    fetchDbPlayers();

    const interval = setInterval(() => {
      if (gameState === 'LOBBY') {
        fetchDbPlayers();
      } else if (gameState === 'QUESTION') {
        checkPhoneAnswers();
      }
    }, 1000);

    const channel = supabase.channel(`game_${pinCode}`);

    channel.on('broadcast', { event: 'SUBMIT_ANSWER' }, ({ payload }) => {
      handleAnswerSubmitted(
        String(payload.playerId),
        payload.answerIndex,
        payload.timeTaken
      );
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [
    pinCode,
    loading,
    gameState,
    fetchDbPlayers,
    checkPhoneAnswers,
    handleAnswerSubmitted,
  ]);

  // מנגנון הטיימר לשאלה הנוכחית
  useEffect(() => {
    if (gameState === 'QUESTION' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'QUESTION') {
      endQuestion();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, timeLeft]);

  const startGame = () => {
    if (players.length === 0) {
      alert('יש להמתין לפחות לשחקן אחד!');
      return;
    }
    startQuestion(0);
  };

  const startQuestion = (index: number) => {
    if (!questions[index]) return;

    setCurrentQuestionIndex(index);
    setAnswersCount(0);
    setTimeLeft(questions[index].time_limit || 20);
    setGameState('QUESTION');

    setPlayers((prev) =>
      prev.map((p) => ({ ...p, lastAnswerIndex: undefined }))
    );

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

  const endQuestion = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('SHOW_RESULT');

    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;

    channelRef.current?.send({
      type: 'broadcast',
      event: 'QUESTION_END',
      payload: { correctOption: currentQ.correct_option },
    });
  };

  const showLeaderboard = () => setGameState('LEADERBOARD');

  // ניתוק שיחות IVR ומחיקת נתונים מכל הטבלאות
  const finishGameCleanup = async () => {
    setGameState('GAME_OVER');
    const pinStr = String(pinCode);

    try {
      // א. שולפים מראש את כל מספרי הטלפון שהשתתפו במשחק
      const { data: dbPlayers } = await supabase
        .from('game_players')
        .select('phone')
        .eq('game_pin', pinStr);

      const phones =
        dbPlayers?.map((p) => String(p.phone)).filter(Boolean) || [];

      // ב. עדכון IVR לסטטוס FINISHED - מורה למרכזייה להשמיע הודעת סיום ולנתק את השיחה
      await supabase
        .from('ivr_sessions')
        .update({ status: 'FINISHED' })
        .or(
          `pin.eq.${pinStr}${
            phones.length > 0 ? `,phone.in.(${phones.join(',')})` : ''
          }`
        );

      // ג. שידור מניעת פעולות לקוח באתר
      channelRef.current?.send({
        type: 'broadcast',
        event: 'GAME_OVER',
        payload: {},
      });

      // ד. השהיה קצרה של 1.5 שניות שמאפשרת למערכת הקולית לקבל את הודעת הניתוק
      await new Promise((res) => setTimeout(res, 1500));

      // ה. מחיקת כל הנתונים מ-3 הטבלאות
      await Promise.all([
        supabase.from('game_answers').delete().eq('game_pin', pinStr),
        supabase.from('game_players').delete().eq('game_pin', pinStr),
        supabase.from('ivr_sessions').delete().eq('pin', pinStr),
      ]);

      if (phones.length > 0) {
        await supabase.from('ivr_sessions').delete().in('phone', phones);
      }
    } catch (err) {
      console.error('שגיאה בתהליך הניתוק והניקוי:', err);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex + 1 < questions.length) {
      startQuestion(currentQuestionIndex + 1);
    } else {
      finishGameCleanup();
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d041e] text-white flex justify-center items-center dir-rtl">
        <p className="text-white/60 animate-pulse">מכין את קוד המשחק...</p>
      </main>
    );
  }

  const currentQ = questions[currentQuestionIndex];
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <main className="min-h-screen bg-[#0d041e] text-white dir-rtl flex flex-col justify-between p-6 md:p-10 select-none">
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-black text-fuchsia-300">
            {quizTitle || 'טוען שאלון...'}
          </h1>
          <p className="text-xs text-white/50">מנחה המשחק</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white/10 px-6 py-2 rounded-2xl border border-white/20 text-center">
            <span className="text-xs text-white/60 block">קוד PIN:</span>
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

      {/* LOBBY */}
      {gameState === 'LOBBY' && (
        <div className="max-w-4xl mx-auto w-full text-center py-12">
          <h2 className="text-3xl md:text-5xl font-black mb-3">
            היכנסו ל-MegaClick או התקשרו במערכת הקולית
          </h2>
          <p className="text-white/60 text-lg mb-8">
            הזינו את הקוד <strong className="text-fuchsia-400">{pinCode}</strong>
          </p>

          <div className="glass rounded-3xl p-8 border border-white/10 min-h-[250px] mb-8 flex flex-wrap gap-4 items-center justify-center">
            {players.length === 0 ? (
              <p className="text-white/40 animate-pulse text-lg">
                מחכה לשחקנים...
              </p>
            ) : (
              players.map((p) => (
                <div
                  key={p.id}
                  className="bg-gradient-to-r from-fuchsia-500/20 to-violet-500/20 border border-fuchsia-500/40 px-6 py-3 rounded-2xl font-bold text-lg"
                >
                  👤 {p.name}
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
              className="px-10 py-4 rounded-2xl font-black text-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 shadow-xl transition-all cursor-pointer"
            >
              התחל משחק 🚀
            </button>
          </div>
        </div>
      )}

      {/* QUESTION */}
      {gameState === 'QUESTION' && currentQ && (
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

      {/* SHOW RESULT */}
      {gameState === 'SHOW_RESULT' && currentQ && (
        <div className="max-w-4xl mx-auto w-full text-center py-10">
          <h2 className="text-4xl font-black mb-8">התשובה הנכונה היא:</h2>
          <div className="glass p-8 rounded-3xl border-2 border-emerald-500 bg-emerald-500/10 text-3xl font-black text-emerald-300 mb-10">
            {currentQ.options[currentQ.correct_option]}
          </div>
          <button
            onClick={showLeaderboard}
            className="px-10 py-4 rounded-2xl font-black text-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 shadow-xl transition-all cursor-pointer"
          >
            הצג טבלת מובילים 🏆
          </button>
        </div>
      )}

      {/* LEADERBOARD */}
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
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm bg-white/10">
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
              className="px-10 py-4 rounded-2xl font-black text-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 shadow-xl transition-all cursor-pointer"
            >
              {currentQuestionIndex + 1 < questions.length
                ? 'לשאלה הבאה ➔'
                : 'לסיום המשחק 🎉'}
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER */}
      {gameState === 'GAME_OVER' && (
        <div className="max-w-3xl mx-auto w-full text-center py-12">
          <h2 className="text-5xl font-black mb-4">המנצחים הגדולים! 🎉</h2>
          {sortedPlayers.length > 0 && (
            <div className="glass p-8 rounded-3xl border border-fuchsia-500/50 my-8">
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
            className="inline-block px-10 py-4 rounded-2xl font-black text-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
          >
            חזרה לדשבורד
          </Link>
        </div>
      )}
    </main>
  );
}
