'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Question {
  id: string;
  question_text: string;
  options: string[] | string;
  correct_option: number | null;
  correct_options?: number[];
  question_type: 'single_choice' | 'multiple_correct' | 'true_false' | 'poll' | 'range';
  min_range?: number | null;
  max_range?: number | null;
  correct_range_value?: number | null;
  time_limit: number;
}

interface Player {
  id: string;
  name: string;
  score: number;
  phone: string;
  lastAnswerIndex?: number;
  lastAnswerValue?: number | string;
}

type GameState =
  | 'LOBBY'
  | 'QUESTION'
  | 'SHOW_RESULT'
  | 'LEADERBOARD'
  | 'GAME_OVER';

export default function HostGamePage() {
  const router = useRouter();
  const routeParams = useParams();
  const quizId = (routeParams?.quizId as string) || '';

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
  const questionStartTimeRef = useRef<number>(Date.now());

  const getParsedOptions = (options: string[] | string | undefined): string[] => {
    if (!options) return [];
    if (Array.isArray(options)) return options;
    if (typeof options === 'string') {
      try {
        const parsed = JSON.parse(options);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  useEffect(() => {
    if (!quizId) return;
    const initHost = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

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

        await supabase.from('games').insert({
          pin: pinCode,
          quiz_id: quizId,
          status: 'LOBBY',
          current_question_index: 0,
        });

      } catch (err) {
        console.error('שגיאה בטעינת נתונים:', err);
      } finally {
        setLoading(false);
      }
    };
    initHost();
  }, [quizId, pinCode, router]);

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
          const playerPhone = String(dbP.phone || dbP.id || '');
          const existing = prev.find(
            (p) => p.phone === playerPhone || p.id === String(dbP.id)
          );
          return {
            id: String(dbP.id || playerPhone),
            phone: playerPhone,
            name: dbP.player_name || `שחקן ${playerPhone.slice(-4)}`,
            score: existing ? existing.score : (dbP.score || 0),
            lastAnswerIndex: existing ? existing.lastAnswerIndex : undefined,
            lastAnswerValue: existing ? existing.lastAnswerValue : undefined,
          };
        });
      });
    }
  }, [pinCode]);

  const handleAnswerSubmitted = useCallback(
    (identifier: string, answerVal: number | string, timeTaken: number) => {
      const currentQ = questions[currentQuestionIndex];
      if (!currentQ || identifier === undefined || identifier === null) return;

      const cleanId = String(identifier).replace(/\D/g, '');

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
            if (p.lastAnswerIndex !== undefined || p.lastAnswerValue !== undefined) return p;
            isNewAnswer = true;

            let bonus = 0;

            // סקר (Poll) - ללא ניקוד בכלל
            if (currentQ.question_type === 'poll') {
              bonus = 0;
            } 
            // טווח מספרים (Range) - חישוב קרבה לתשובה הנכונה
            else if (currentQ.question_type === 'range') {
              const numVal = Number(answerVal);
              const correctVal = Number(currentQ.correct_range_value ?? 0);
              const minR = Number(currentQ.min_range ?? 0);
              const maxR = Number(currentQ.max_range ?? 100);
              const maxPossibleDiff = Math.max(Math.abs(maxR - correctVal), Math.abs(minR - correctVal), 1);
              const diff = Math.abs(numVal - correctVal);
              
              // ככל שההפרש קטן יותר, הניקוד גבוה יותר (מקסימום 1000)
              const accuracy = Math.max(0, 1 - diff / maxPossibleDiff);
              bonus = Math.round(1000 * accuracy * Math.max(0.2, (1 - timeTaken / (currentQ.time_limit || 20))));
            } 
            // שאלות רגילות / רב בררה / נכון-לא נכון
            else {
              const isCorrect = Number(answerVal) === Number(currentQ.correct_option);
              bonus = isCorrect
                ? Math.max(
                    200,
                    Math.round(
                      1000 * (1 - timeTaken / (currentQ.time_limit || 20))
                    )
                  )
                : 0;
            }

            return {
              ...p,
              score: p.score + bonus,
              lastAnswerIndex: currentQ.question_type === 'range' ? undefined : Number(answerVal),
              lastAnswerValue: currentQ.question_type === 'range' ? answerVal : undefined,
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

  const checkPhoneAnswers = useCallback(async () => {
    if (gameState !== 'QUESTION') return;

    const { data } = await supabase
      .from('game_answers')
      .select('*')
      .eq('game_pin', String(pinCode))
      .eq('question_index', currentQuestionIndex);

    if (data && data.length > 0) {
      data.forEach((ans) => {
        if (ans.phone !== undefined) {
          const answerTime = ans.created_at
            ? (new Date(ans.created_at).getTime() - questionStartTimeRef.current) / 1000
            : (Date.now() - questionStartTimeRef.current) / 1000;
          const timeTaken = Math.max(0, answerTime);
          const valToSubmit = ans.answer_value !== undefined && ans.answer_value !== null ? ans.answer_value : ans.answer_index;
          handleAnswerSubmitted(String(ans.phone), valToSubmit, timeTaken);
        }
      });
    }
  }, [gameState, pinCode, currentQuestionIndex, handleAnswerSubmitted]);

  useEffect(() => {
    if (loading) return;
    fetchDbPlayers();

    const interval = setInterval(() => {
      fetchDbPlayers();
      if (gameState === 'QUESTION') {
        checkPhoneAnswers();
      }
    }, 1000);

    const channel = supabase.channel(`game_${pinCode}`);
    channel.on('broadcast', { event: 'SUBMIT_ANSWER' }, ({ payload }) => {
      if (payload) {
        handleAnswerSubmitted(
          String(payload.playerId),
          payload.answerValue !== undefined ? payload.answerValue : payload.answerIndex,
          payload.timeTaken || 0
        );
      }
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

  const endQuestion = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('SHOW_RESULT');

    await supabase
      .from('games')
      .update({ status: 'SHOW_RESULT' })
      .eq('pin', pinCode);

    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;

    channelRef.current?.send({
      type: 'broadcast',
      event: 'QUESTION_END',
      payload: { 
        correctOption: currentQ.correct_option,
        correctRangeValue: currentQ.correct_range_value 
      },
    });
  }, [questions, currentQuestionIndex, pinCode]);

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
  }, [gameState, timeLeft, endQuestion]);

  const startGame = () => {
    if (questions.length === 0) {
      alert('לא נמצאו שאלות בשאלון זה!');
      return;
    }
    if (players.length === 0) {
      alert('יש להמתין לפחות לשחקן אחד!');
      return;
    }
    startQuestion(0);
  };

  const startQuestion = async (index: number) => {
    const q = questions[index];
    if (!q) return;

    setCurrentQuestionIndex(index);
    setAnswersCount(0);
    setTimeLeft(q.time_limit || 20);
    questionStartTimeRef.current = Date.now();
    setGameState('QUESTION');

    await supabase
      .from('games')
      .update({
        status: 'QUESTION',
        current_question_index: index,
        question_start_time: new Date().toISOString(),
      })
      .eq('pin', pinCode);

    setPlayers((prev) =>
      prev.map((p) => ({ ...p, lastAnswerIndex: undefined, lastAnswerValue: undefined }))
    );

    const parsedOptions = getParsedOptions(q.options);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'QUESTION_START',
      payload: {
        questionIndex: index,
        questionText: q.question_text,
        questionType: q.question_type,
        options: parsedOptions,
        minRange: q.min_range,
        maxRange: q.max_range,
        timeLimit: q.time_limit || 20,
      },
    });
  };

  const showLeaderboard = () => setGameState('LEADERBOARD');

  const finishGameCleanup = async () => {
    setGameState('GAME_OVER');
    const pinStr = String(pinCode);

    try {
      await supabase
        .from('games')
        .update({ status: 'FINISHED' })
        .eq('pin', pinStr);

      const { data: dbPlayers } = await supabase
        .from('game_players')
        .select('phone')
        .eq('game_pin', pinStr);

      const phones =
        dbPlayers?.map((p) => String(p.phone)).filter(Boolean) || [];

      await supabase
        .from('ivr_sessions')
        .update({ status: 'FINISHED' })
        .eq('pin', pinStr);

      if (phones.length > 0) {
        await supabase
          .from('ivr_sessions')
          .update({ status: 'FINISHED' })
          .in('phone', phones);
      }

      channelRef.current?.send({
        type: 'broadcast',
        event: 'GAME_OVER',
        payload: {},
      });

      await new Promise((res) => setTimeout(res, 1500));

      await supabase.from('game_answers').delete().eq('game_pin', pinStr);
      await supabase.from('game_players').delete().eq('game_pin', pinStr);
      await supabase.from('ivr_sessions').delete().eq('pin', pinStr);

      if (phones.length > 0) {
        await supabase.from('game_players').delete().in('phone', phones);
        await supabase.from('ivr_sessions').delete().in('phone', phones);
      }
    } catch (err) {
      console.error('שגיאה בתהליך סיום המשחק והניקוי:', err);
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
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin shadow-2xl shadow-fuchsia-500/50" />
          <p className="text-white/60 font-medium text-sm tracking-wide animate-pulse">מכין את קוד המשחק...</p>
        </div>
      </main>
    );
  }

  const currentQ = questions[currentQuestionIndex];
  const currentOptions = currentQ ? getParsedOptions(currentQ.options) : [];
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <main className="min-h-screen bg-[#0d041e] text-white dir-rtl flex flex-col justify-between p-6 md:p-10 select-none overflow-x-hidden relative">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 bg-[#130728]/80 px-8 py-5 backdrop-blur-2xl rounded-3xl shadow-2xl z-10">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-fuchsia-300 via-pink-300 to-white bg-clip-text text-transparent">
            {quizTitle || 'שאלון ללא שם'}
          </h1>
          <p className="text-xs text-white/50 font-medium">מרחב ניהול משחק חי</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-fuchsia-500/20 to-violet-500/20 px-6 py-2.5 rounded-2xl border border-fuchsia-500/30 text-center shadow-inner">
            <span className="text-[10px] text-white/60 block font-bold uppercase tracking-wider">קוד PIN למשחק:</span>
            <span className="text-3xl font-black tracking-widest text-fuchsia-300 drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]">
              {pinCode}
            </span>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all text-xs font-bold border border-white/10"
          >
            יציאה ✕
          </Link>
        </div>
      </header>

      {/* LOBBY */}
      {gameState === 'LOBBY' && (
        <div className="max-w-5xl mx-auto w-full py-10 z-10 animate-fade-in">
          <div className="text-center mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 font-bold text-xs mb-4 border border-fuchsia-500/30">
              שלב ההמתנה למשתתפים ⏳
            </span>
            <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
              היכנסו למערכת או התקשרו לחייגן
            </h2>
            <p className="text-white/70 text-base md:text-lg mb-8 font-light">
              הזינו את קוד הכניסה <strong className="text-fuchsia-300 tracking-wider font-black">{pinCode}</strong> או התקשרו לחייגן
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center shadow-inner">
                <span className="text-xs text-white/50 mb-1 font-medium">חיוג מהיר בטלפון:</span>
                <a href="tel:0772661266" className="text-2xl font-black text-fuchsia-300 tracking-widest hover:text-white transition-colors">
                  077-2661266
                </a>
              </div>
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center shadow-inner">
                <span className="text-xs text-white/50 mb-1 font-medium">כתובת האתר:</span>
                <span className="text-sm font-bold text-violet-300">
                  mega-click-1.vercel.app
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#16082d]/80 border border-white/15 rounded-3xl p-8 min-h-[260px] mb-8 flex flex-wrap gap-4 items-center justify-center shadow-2xl backdrop-blur-xl">
            {players.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="w-10 h-10 border-4 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin" />
                <p className="text-white/40 font-medium text-sm">מחכה לשחקנים שיתחברו...</p>
              </div>
            ) : (
              players.map((p) => (
                <div
                  key={p.id}
                  className="bg-gradient-to-r from-fuchsia-500/20 to-violet-500/20 border border-fuchsia-500/40 px-6 py-3.5 rounded-2xl font-bold text-base shadow-lg animate-scale-up flex items-center gap-2"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>👤 {p.name}</span>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-4">
            <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl">
              <span className="text-sm font-bold text-fuchsia-300">
                {players.length} שחקנים מחוברים כעת
              </span>
            </div>
            <button
              onClick={startGame}
              className="w-full sm:w-auto px-12 py-5 rounded-2xl font-black text-xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-600 hover:scale-105 active:scale-95 shadow-2xl shadow-fuchsia-500/40 transition-all cursor-pointer"
            >
              התחל משחק עכשיו 🚀 ({questions.length} שאלות)
            </button>
          </div>
        </div>
      )}

      {/* QUESTION */}
      {gameState === 'QUESTION' && currentQ && (
        <div className="max-w-5xl mx-auto w-full py-6 z-10 animate-scale-up">
          <div className="flex justify-between items-center mb-8 bg-[#16082d]/60 border border-white/10 px-6 py-4 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-fuchsia-300">
                שאלה {currentQuestionIndex + 1} מתוך {questions.length}
              </span>
              {currentQ.question_type === 'poll' && (
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  סקר (ללא ניקוד)
                </span>
              )}
              {currentQ.question_type === 'range' && (
                <span className="bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  שאלה טווח מספרים
                </span>
              )}
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center bg-white/5 px-4 py-1.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-white/50 block font-bold">תשובות שנקלטו</span>
                <span className="text-xl font-black text-white">
                  {answersCount} / {players.length}
                </span>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-violet-600 p-0.5 shadow-xl shadow-fuchsia-500/30 flex items-center justify-center">
                <div className="w-full h-full bg-[#130728] rounded-[14px] flex items-center justify-center">
                  <span className={`text-xl font-black ${timeLeft <= 5 ? 'text-red-400 animate-bounce' : 'text-white'}`}>
                    {timeLeft}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#16082d]/90 border border-white/15 rounded-3xl p-8 md:p-12 text-center mb-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <h2 className="text-3xl md:text-5xl font-black leading-snug text-white tracking-tight">
              {currentQ.question_text}
            </h2>
            {currentQ.question_type === 'range' && (
              <div className="mt-4 inline-block bg-fuchsia-500/15 border border-fuchsia-500/30 px-6 py-2 rounded-2xl text-fuchsia-200 text-sm font-bold">
                📊 טווח מספרים מותר למענה: {currentQ.min_range} עד {currentQ.max_range} (יש להקליד מספר בטלפון ולסיים בסולמית #)
              </div>
            )}
          </div>

          {currentQ.question_type !== 'range' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentOptions.map((opt, i) => {
                const colors = [
                  'from-rose-600 to-red-700 shadow-red-500/20 border-red-500/30',
                  'from-blue-600 to-indigo-700 shadow-blue-500/20 border-blue-500/30',
                  'from-amber-500 to-orange-600 shadow-orange-500/20 border-orange-500/30',
                  'from-emerald-600 to-teal-700 shadow-emerald-500/20 border-emerald-500/30',
                ];
                return (
                  <div
                    key={i}
                    className={`p-6 rounded-2xl bg-gradient-to-r ${colors[i % colors.length]} shadow-xl flex items-center justify-between border text-white font-bold text-xl backdrop-blur-md`}
                  >
                    <span className="truncate">{opt}</span>
                    <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-sm font-black shrink-0">
                      {i + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SHOW RESULT */}
      {gameState === 'SHOW_RESULT' && currentQ && (
        <div className="max-w-4xl mx-auto w-full text-center py-12 z-10 animate-scale-up">
          <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs mb-4 border border-emerald-500/30">
            הסתיים זמן השאלה 🛑
          </span>

          {currentQ.question_type === 'poll' ? (
            <div>
              <h2 className="text-4xl font-black mb-6">תוצאות הסקר 📊</h2>
              <div className="space-y-4 mb-10 text-right">
                {currentOptions.map((opt, idx) => {
                  const votesCount = players.filter((p) => p.lastAnswerIndex === idx).length;
                  const percent = answersCount > 0 ? Math.round((votesCount / answersCount) * 100) : 0;
                  return (
                    <div key={idx} className="bg-[#16082d]/80 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                      <div className="flex justify-between font-bold text-sm mb-2">
                        <span>{idx + 1}. {opt}</span>
                        <span className="text-fuchsia-300">{votesCount} הצעובות ({percent}%)</span>
                      </div>
                      <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-fuchsia-500 to-violet-600 h-full transition-all duration-1000"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : currentQ.question_type === 'range' ? (
            <div>
              <h2 className="text-4xl font-black mb-2">התשובה הנכונה המדויקת היא:</h2>
              <div className="p-8 rounded-3xl border-2 border-fuchsia-500 bg-fuchsia-500/10 text-4xl font-black text-fuchsia-300 mb-10 shadow-2xl shadow-fuchsia-500/20 backdrop-blur-xl">
                {currentQ.correct_range_value}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-4xl font-black mb-8">התשובה הנכונה היא:</h2>
              <div className="p-8 rounded-3xl border-2 border-emerald-500 bg-emerald-500/10 text-3xl font-black text-emerald-300 mb-10 shadow-2xl shadow-emerald-500/20 backdrop-blur-xl">
                {currentOptions[Number(currentQ.correct_option)] || 'תשובה לא מוגדרת'}
              </div>
            </div>
          )}

          <button
            onClick={showLeaderboard}
            className="px-12 py-5 rounded-2xl font-black text-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:scale-105 active:scale-95 shadow-2xl shadow-fuchsia-500/40 transition-all cursor-pointer"
          >
            {currentQ.question_type === 'poll' ? 'המשך משחק ➔' : 'הצג טבלת מובילים 🏆'}
          </button>
        </div>
      )}

      {/* LEADERBOARD */}
      {gameState === 'LEADERBOARD' && (
        <div className="max-w-3xl mx-auto w-full py-8 z-10 animate-scale-up">
          <h2 className="text-4xl font-black text-center mb-8 bg-gradient-to-r from-amber-300 to-fuchsia-300 bg-clip-text text-transparent">
            טבלת מובילים 🏆
          </h2>
          <div className="space-y-3 mb-10">
            {sortedPlayers.slice(0, 5).map((p, rank) => (
              <div
                key={p.id}
                className="bg-[#16082d]/80 border border-white/10 p-5 rounded-2xl flex items-center justify-between font-bold text-lg shadow-xl backdrop-blur-md"
              >
                <div className="flex items-center gap-4">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-md ${
                    rank === 0 ? 'bg-amber-400 text-black' : rank === 1 ? 'bg-slate-300 text-black' : rank === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-white'
                  }`}>
                    {rank + 1}
                  </span>
                  <span className="text-white">{p.name}</span>
                </div>
                <span className="text-fuchsia-300 font-black">{p.score} נק׳</span>
              </div>
            ))}
          </div>
          <div className="text-center">
            <button
              onClick={nextQuestion}
              className="px-12 py-5 rounded-2xl font-black text-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:scale-105 active:scale-95 shadow-2xl shadow-fuchsia-500/40 transition-all cursor-pointer"
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
        <div className="max-w-3xl mx-auto w-full text-center py-12 z-10 animate-scale-up">
          <span className="inline-block px-4 py-1.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 font-bold text-xs mb-4 border border-fuchsia-500/30">
            המשחק הסתיים בהצלחה 🎉
          </span>
          <h2 className="text-5xl font-black mb-6">המנצחים הגדולים!</h2>
          {sortedPlayers.length > 0 && (
            <div className="bg-[#16082d]/90 border border-fuchsia-500/40 p-10 rounded-3xl my-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="text-7xl mb-4 animate-bounce">🥇</div>
              <h3 className="text-3xl md:text-4xl font-black text-fuchsia-300 mb-2">
                {sortedPlayers[0]?.name}
              </h3>
              <p className="text-2xl font-bold text-white/90">
                {sortedPlayers[0]?.score} נקודות
              </p>
            </div>
          )}
          <Link
            href="/dashboard"
            className="inline-block px-10 py-4 rounded-2xl font-black text-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all shadow-xl"
          >
            חזרה לדשבורד ➔
          </Link>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-white/30 border-t border-white/5 z-10 font-medium">
        MegaClick Live Host System • חיוג למערכת: 077-2661266 • mega-click-1.vercel.app
      </footer>
    </main>
  );
}
