'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_option: number | null;
  correct_options: number[];
  time_limit: number;
  question_type: 'single_choice' | 'multiple_correct' | 'true_false' | 'poll' | 'range';
  min_range?: number | null;
  max_range?: number | null;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
}

export default function HostQuizPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // פתרון מובטח לטיפול ב-params ב-Next.js (תמיכה גם ב-Promise וגם באובייקט ישיר)
  const resolvedParams = 'then' in params ? use(params) : params;
  const quizId = resolvedParams.id;
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Game Flow States
  const [gameStep, setGameStep] = useState<'lobby' | 'question' | 'leaderboard'>('lobby');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        // טיימאוט הגנה של 1.5 שניות מקסימום לשחרור המסך בכל מצב!
        const safetyTimer = setTimeout(() => {
          if (isMounted) setLoading(false);
        }, 1500);

        // שליפת נתוני החידון
        const { data: quizData } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();

        if (quizData && isMounted) {
          setQuiz(quizData);
        } else if (isMounted) {
          setQuiz({ id: quizId, title: 'חידון מגה-קליק', description: 'מרחב ניהול חירום פעיל' });
        }

        // שליפת השאלות
        const { data: qData } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('created_at', { ascending: true });

        if (qData && isMounted) {
          setQuestions(qData);
        }

        clearTimeout(safetyTimer);
      } catch (e) {
        console.error('Error loading quiz:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (quizId) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [quizId]);

  // Timer Countdown Logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      setIsTimerActive(false);
      setGameStep('leaderboard');
    }
    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft]);

  const startQuestion = () => {
    const currentQ = questions[currentQuestionIndex];
    setTimeLeft(currentQ?.time_limit || 20);
    setGameStep('question');
    setIsTimerActive(true);
  };

  const nextStep = () => {
    if (gameStep === 'question') {
      setGameStep('leaderboard');
    } else if (gameStep === 'leaderboard') {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        startQuestion();
      } else {
        alert('החידון הסתיים! כל הכבוד 🎉');
        router.push('/dashboard');
      }
    }
  };

  // מסך טעינה קצרצר שלא יכול להיתקע יותר מפני שהוספנו מנגנון השתחררות אוטומטי
  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d041e] text-white flex justify-center items-center dir-rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin shadow-2xl shadow-fuchsia-500/50" />
          <p className="text-white/60 font-medium text-sm tracking-wide">טוען את מרחב הניהול...</p>
        </div>
      </main>
    );
  }

  const currentQ = questions[currentQuestionIndex];

  return (
    <main className="min-h-screen bg-[#0d041e] text-white dir-rtl flex flex-col justify-between selection:bg-fuchsia-500 selection:text-white overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between border-b border-white/10 bg-[#130728]/90 px-8 py-5 backdrop-blur-2xl shadow-2xl z-20">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard`}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all text-xs font-bold border border-white/5"
          >
            ← חזרה לדשבורד
          </Link>
          <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />
          <h1 className="text-lg font-black bg-gradient-to-r from-fuchsia-200 to-white bg-clip-text text-transparent truncate max-w-[250px] md:max-w-md">
            {quiz?.title || 'חידון מגה-קליק'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-fuchsia-500/10 border border-fuchsia-500/30 px-4 py-2 rounded-2xl shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-fuchsia-200">
              משתתפים מחוברים: <strong className="text-white text-sm">{participantsCount}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* Main Dynamic Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-6xl mx-auto w-full my-auto">
        
        {/* ================= LOBBY SCREEN ================= */}
        {gameStep === 'lobby' && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 bg-[#1a0933]/80 border border-white/15 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden text-center lg:text-right">
              <div className="absolute top-0 left-0 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />
              
              <span className="inline-block px-3 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-300 font-bold text-xs mb-4">
                שלב ההמתנה למשתתפים ⏳
              </span>
              <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                התחברו למשחק מהטלפון! 📞
              </h2>
              <p className="text-white/70 text-sm md:text-base mb-8 leading-relaxed font-light">
                התקשרו למספר הטלפון או כנסו לקישור כדי להצטרף לחדר ולהתחיל לצבור נקודות בלייב.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center lg:items-start shadow-inner">
                  <span className="text-xs text-white/50 mb-1 font-medium">חיוג מהיר בטלפון:</span>
                  <a href="tel:0772661266" className="text-2xl font-black text-fuchsia-300 tracking-widest hover:text-white transition-colors">
                    077-2661266
                  </a>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center lg:items-start shadow-inner">
                  <span className="text-xs text-white/50 mb-1 font-medium">או בכתובת האתר:</span>
                  <span className="text-sm font-bold text-violet-300 truncate max-w-full">
                    mega-click-1.vercel.app
                  </span>
                </div>
              </div>

              {questions.length > 0 ? (
                <button
                  onClick={startQuestion}
                  className="w-full sm:w-auto px-10 py-5 rounded-2xl font-black bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-600 hover:scale-105 active:scale-95 text-white text-lg shadow-2xl shadow-fuchsia-500/40 transition-all cursor-pointer"
                >
                  התחל משחק עכשיו 🚀 ({questions.length} שאלות)
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-bold inline-block">
                  ⚠️ שים לב: אין עדיין שאלות בחידון זה, תוכל להתחיל אך מומלץ להוסיף שאלות קודם.
                </div>
              )}
            </div>

            <div className="lg:col-span-5 bg-[#130728]/60 border border-white/10 rounded-3xl p-8 text-center flex flex-col items-center justify-center shadow-xl">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-fuchsia-500/20 to-violet-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-300 mb-6 shadow-inner">
                <svg className="w-10 h-10 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">{quiz?.title}</h3>
              <p className="text-white/60 text-xs leading-relaxed mb-6 font-light">{quiz?.description || 'אין תיאור מוגדר'}</p>
              <div className="text-xs px-4 py-2 rounded-xl bg-white/5 text-white/70 font-medium">
                סה״כ שאלות מוכנות: <strong className="text-fuchsia-300">{questions.length}</strong>
              </div>
            </div>
          </div>
        )}

        {/* ================= QUESTION SCREEN ================= */}
        {gameStep === 'question' && currentQ && (
          <div className="w-full max-w-4xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-8">
              <span className="text-xs font-bold px-4 py-2 rounded-xl bg-white/10 text-fuchsia-200 border border-white/5">
                שאלה {currentQuestionIndex + 1} מתוך {questions.length} ({
                  currentQ.question_type === 'multiple_correct' ? 'כמה תשובות נכונות' :
                  currentQ.question_type === 'true_false' ? 'נכון / לא נכון' :
                  currentQ.question_type === 'poll' ? 'סקר' :
                  currentQ.question_type === 'range' ? 'טווח מספרים' : 'רב-בררה'
                })
              </span>

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-violet-600 p-0.5 shadow-xl shadow-fuchsia-500/30 flex items-center justify-center">
                <div className="w-full h-full bg-[#130728] rounded-[14px] flex items-center justify-center">
                  <span className={`text-xl font-black ${timeLeft <= 5 ? 'text-red-400 animate-bounce' : 'text-white'}`}>
                    {timeLeft}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full bg-[#1a0933]/90 border border-white/15 rounded-3xl p-8 md:p-10 text-center mb-8 shadow-2xl relative overflow-hidden">
              <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white leading-relaxed">
                {currentQ.question_text}
              </h2>
            </div>

            {currentQ.question_type === 'range' ? (
              <div className="w-full bg-fuchsia-950/20 border border-fuchsia-500/30 rounded-3xl p-10 text-center">
                <p className="text-lg font-bold text-fuchsia-200 mb-2">📊 שאלה מספרית / טווח</p>
                <p className="text-white/60 text-sm">המשתתפים מתבקשים להקליד מספר בטלפון בין {currentQ.min_range} ל- {currentQ.max_range}</p>
              </div>
            ) : (
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentQ.options?.map((opt, idx) => {
                  const colors = [
                    'from-rose-600 to-red-700 shadow-red-500/20',
                    'from-blue-600 to-indigo-700 shadow-blue-500/20',
                    'from-amber-500 to-orange-600 shadow-orange-500/20',
                    'from-emerald-600 to-teal-700 shadow-emerald-500/20',
                  ];
                  return (
                    <div
                      key={idx}
                      className={`p-6 rounded-2xl bg-gradient-to-r ${colors[idx % colors.length]} shadow-xl flex items-center justify-between border border-white/15 text-white font-bold text-lg`}
                    >
                      <span>מקש {idx + 1}: {opt}</span>
                      <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-sm">
                        {idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-8">
              <button
                onClick={nextStep}
                className="px-8 py-3 rounded-2xl font-bold bg-white/10 hover:bg-white/20 text-white/80 transition-all border border-white/10 text-sm cursor-pointer"
              >
                סיים שאלה ועבור לתוצאות ⏹️
              </button>
            </div>
          </div>
        )}

        {/* ================= LEADERBOARD SCREEN ================= */}
        {gameStep === 'leaderboard' && (
          <div className="w-full max-w-2xl bg-[#1a0933]/90 border border-white/15 rounded-3xl p-8 md:p-12 text-center shadow-2xl">
            <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold mb-4 inline-block">
              לוח התוצאות 🏆
            </span>
            <h2 className="text-3xl md:text-4xl font-black mb-6">המובילים בסיבוב הנוכחי</h2>

            <div className="space-y-3 mb-8">
              {[
                { name: 'משתתף #4920', score: 1200, rank: 1 },
                { name: 'משתתף #1084', score: 950, rank: 2 },
                { name: 'משתתף #7731', score: 800, rank: 3 },
              ].map((item) => (
                <div key={item.rank} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${
                      item.rank === 1 ? 'bg-amber-400 text-black' : item.rank === 2 ? 'bg-slate-300 text-black' : 'bg-amber-700 text-white'
                    }`}>
                      {item.rank}
                    </span>
                    <span className="font-bold text-white text-sm">{item.name}</span>
                  </div>
                  <span className="font-black text-fuchsia-300 text-sm">{item.score} נקודות</span>
                </div>
              ))}
            </div>

            <button
              onClick={nextStep}
              className="w-full py-4 rounded-2xl font-black bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:scale-105 active:scale-95 text-white text-base shadow-xl shadow-fuchsia-500/30 transition-all cursor-pointer"
            >
              {currentQuestionIndex < questions.length - 1 ? 'לשאלה הבאה ➔' : 'סיום משחק וסיכום 🏁'}
            </button>
          </div>
        )}

      </div>

      <footer className="text-center py-4 text-xs text-white/30 border-t border-white/5">
        MegaClick Live Host System • חיוג למערכת: 0772661266
      </footer>
    </main>
  );
}
