'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type PlayerStep =
  | 'JOIN'
  | 'WAITING'
  | 'QUESTION'
  | 'ANSWERED'
  | 'SHOW_RESULT'
  | 'GAME_OVER';

interface QuestionData {
  questionIndex: number;
  questionText: string;
  questionType: 'single_choice' | 'multiple_correct' | 'true_false' | 'poll' | 'range';
  options: string[];
  minRange?: number | null;
  maxRange?: number | null;
  timeLimit: number;
}

export default function PlayPage() {
  const [pin, setPin] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [step, setStep] = useState<PlayerStep>('JOIN');
  const [error, setError] = useState('');

  const [playerId] = useState(
    () => 'player_' + Math.random().toString(36).substring(2, 9)
  );
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [rangeInputVal, setRangeInputVal] = useState<string>('');
  const [correctOption, setCorrectOption] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  const channelRef = useRef<RealtimeChannel | null>(null);

  const cleanupChannel = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  const joinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!pin || pin.length < 5) {
      setError('נא להזין קוד משחק תקין');
      return;
    }
    if (!playerName.trim()) {
      setError('נא להזין שם שחקן');
      return;
    }

    // ניקוי ערוץ ישן במידה והיה מחובר
    cleanupChannel();

    // 1. שמירת השחקן בטבלת game_players ב-Supabase
    const { error: dbErr } = await supabase.from('game_players').upsert({
      game_pin: pin,
      player_name: playerName,
      phone: playerId, // מפתח מזהה ייחודי לשחקן האתר
    });

    if (dbErr) {
      console.error('Error saving player:', dbErr);
    }

    // 2. חיבור לערוץ Realtime לקבלת השאלות מהמנחה
    const channel = supabase.channel(`game_${pin}`, {
      config: { presence: { key: playerId } },
    });

    channel.on('broadcast', { event: 'QUESTION_START' }, ({ payload }) => {
      setCurrentQuestion(payload);
      setSelectedIndex(null);
      setRangeInputVal('');
      setCorrectOption(null);
      setStartTime(Date.now());
      setStep('QUESTION');
    });

    channel.on('broadcast', { event: 'QUESTION_END' }, ({ payload }) => {
      setCorrectOption(payload.correctOption);
      setStep('SHOW_RESULT');
    });

    channel.on('broadcast', { event: 'GAME_OVER' }, () => {
      setStep('GAME_OVER');
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ name: playerName, score: 0 });
        setStep('WAITING');
      } else if (status === 'CHANNEL_ERROR') {
        setError('לא ניתן להתחבר לחדר. ודא שקוד ה-PIN נכון.');
      }
    });

    channelRef.current = channel;
  };

  const submitAnswer = async (optionIndex: number, answerVal?: string | number) => {
    if (selectedIndex !== null || !currentQuestion) return;

    const timeTaken = (Date.now() - startTime) / 1000;
    const isRange = currentQuestion.questionType === 'range';
    const subVal = isRange ? Number(answerVal) : optionIndex;

    if (isRange && (isNaN(Number(answerVal)) || answerVal === '')) {
      alert('נא להזין מספר תקין');
      return;
    }

    setSelectedIndex(optionIndex);
    setStep('ANSWERED');

    // שמירת תשובת האתר ב-DB (תמיכה גם ב-answer_value לטווחים)
    await supabase.from('game_answers').insert({
      game_pin: pin,
      phone: playerId,
      answer_index: isRange ? null : optionIndex,
      answer_value: isRange ? String(answerVal) : null,
      question_index: currentQuestion.questionIndex,
    });

    // שידור למנחה ב-Broadcast
    channelRef.current?.send({
      type: 'broadcast',
      event: 'SUBMIT_ANSWER',
      payload: {
        playerId,
        answerIndex: isRange ? undefined : optionIndex,
        answerValue: isRange ? answerVal : undefined,
        timeTaken,
      },
    });
  };

  const resetToJoin = () => {
    cleanupChannel();
    setStep('JOIN');
  };

  useEffect(() => {
    return () => {
      cleanupChannel();
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#0d041e] text-white dir-rtl flex flex-col justify-center items-center p-4 select-none relative overflow-hidden">
      {/* תאורת רקע אמביאנטית */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-fuchsia-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[250px] h-[250px] bg-violet-600/20 rounded-full blur-[100px] pointer-events-none" />

      {/* טופס התחברות למשחק */}
      {step === 'JOIN' && (
        <div className="w-full max-w-md z-10 animate-fade-in">
          <form
            onSubmit={joinGame}
            className="bg-[#130728]/80 backdrop-blur-2xl p-8 rounded-3xl border border-white/15 text-center space-y-6 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-600" />
            
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-fuchsia-300 via-pink-300 to-white bg-clip-text text-transparent tracking-tight">
                MegaClick ⚡
              </h1>
              <p className="text-white/60 text-sm mt-1 font-medium">
                הזן קוד משחק ושם כדי להצטרף
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-red-500/20 border border-red-500/50 rounded-2xl text-red-300 text-sm font-bold animate-pulse">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/50 text-right mb-1.5 mr-1">
                  קוד PIN של המשחק
                </label>
                <input
                  type="number"
                  placeholder="123456"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full text-center text-3xl tracking-widest font-black py-3.5 rounded-2xl bg-white/5 border border-white/15 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/30 outline-none transition-all text-fuchsia-200 placeholder-white/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 text-right mb-1.5 mr-1">
                  השם שלך למשחק
                </label>
                <input
                  type="text"
                  placeholder="הכנס שם..."
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full text-center text-lg font-bold py-3.5 rounded-2xl bg-white/5 border border-white/15 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/30 outline-none transition-all text-white placeholder-white/20"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl font-black text-xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-600 hover:scale-[1.02] active:scale-95 shadow-xl shadow-fuchsia-500/30 transition-all cursor-pointer border border-fuchsia-400/30"
            >
              כנס למשחק 🎮
            </button>
          </form>
        </div>
      )}

      {/* מסך המתנה לתחילת המשחק */}
      {step === 'WAITING' && (
        <div className="w-full max-w-md text-center z-10 animate-fade-in">
          <div className="bg-[#130728]/80 backdrop-blur-2xl p-10 rounded-3xl border border-white/15 space-y-6 shadow-2xl">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-fuchsia-500/20 to-violet-500/20 border border-fuchsia-500/40 flex items-center justify-center text-4xl animate-bounce shadow-inner">
              ⏳
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">
                אתה בפנים, <span className="text-fuchsia-300">{playerName}</span>!
              </h2>
              <p className="text-white/60 text-sm mt-2 font-medium">
                המתן שהמנחה יתחיל את השאלה...
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              מחובר בהצלחה למשחק
            </div>
          </div>
        </div>
      )}

      {/* מסך הצגת שאלה ואפשרויות / טווח מספרים */}
      {step === 'QUESTION' && currentQuestion && (
        <div className="w-full max-w-lg space-y-6 z-10 animate-scale-up">
          <div className="bg-[#130728]/90 backdrop-blur-2xl p-6 rounded-3xl border border-white/15 text-center shadow-2xl">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="inline-block px-3 py-1 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 font-extrabold text-xs">
                שאלה {currentQuestion.questionIndex + 1}
              </span>
              {currentQuestion.questionType === 'poll' && (
                <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 font-extrabold text-xs">
                  סקר
                </span>
              )}
              {currentQuestion.questionType === 'range' && (
                <span className="inline-block px-3 py-1 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 font-extrabold text-xs">
                  שאלת טווח
                </span>
              )}
            </div>

            <h2 className="text-2xl font-black leading-snug text-white">
              {currentQuestion.questionText}
            </h2>
          </div>

          {/* אם זו שאלת טווח - הצג שדה הקלדת מספר */}
          {currentQuestion.questionType === 'range' ? (
            <div className="bg-[#130728]/90 backdrop-blur-2xl p-6 rounded-3xl border border-white/15 text-center shadow-2xl space-y-4">
              <p className="text-xs text-white/60 font-medium">
                טווח מספרים מותר: <strong className="text-fuchsia-300">{currentQuestion.minRange}</strong> עד <strong className="text-fuchsia-300">{currentQuestion.maxRange}</strong>
              </p>
              <input
                type="number"
                placeholder="הקלד מספר..."
                value={rangeInputVal}
                onChange={(e) => setRangeInputVal(e.target.value)}
                className="w-full text-center text-3xl font-black py-4 rounded-2xl bg-white/5 border border-white/20 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/30 outline-none text-fuchsia-200 placeholder-white/20"
              />
              <button
                onClick={() => submitAnswer(0, rangeInputVal)}
                className="w-full py-4 rounded-2xl font-black text-xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-600 hover:scale-[1.02] active:scale-95 shadow-xl shadow-fuchsia-500/30 transition-all cursor-pointer"
              >
                שלח תשובה 🚀
              </button>
            </div>
          ) : (
            /* שאלות רגילות / סקר בררה רגיל */
            <div className="grid grid-cols-1 gap-3.5">
              {currentQuestion.options.map((opt, i) => {
                const colors = [
                  'from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 border-red-500/40 shadow-red-500/20',
                  'from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 border-blue-500/40 shadow-blue-500/20',
                  'from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 border-orange-500/40 shadow-orange-500/20',
                  'from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 border-emerald-500/40 shadow-emerald-500/20',
                ];
                return (
                  <button
                    key={i}
                    onClick={() => submitAnswer(i)}
                    className={`w-full p-5 rounded-2xl bg-gradient-to-r ${colors[i % 4]} border-2 text-white font-black text-xl shadow-lg flex items-center justify-between active:scale-95 transition-all cursor-pointer`}
                  >
                    <span className="truncate">{opt}</span>
                    <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-sm font-black shrink-0">
                      {i + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* מסך לאחר אישור שליחת תשובה */}
      {step === 'ANSWERED' && (
        <div className="w-full max-w-md text-center z-10 animate-fade-in">
          <div className="bg-[#130728]/80 backdrop-blur-2xl p-10 rounded-3xl border border-white/15 space-y-4 shadow-2xl">
            <div className="text-6xl animate-bounce">👍</div>
            <h2 className="text-3xl font-black text-white">התשובה נשלחה!</h2>
            <p className="text-white/60 text-sm font-medium">
              מחכים ליתר השחקנים ולתום הזמן...
            </p>
          </div>
        </div>
      )}

      {/* מסך תוצאת השאלה */}
      {step === 'SHOW_RESULT' && (
        <div className="w-full max-w-md text-center z-10 animate-scale-up">
          <div className="bg-[#130728]/80 backdrop-blur-2xl p-10 rounded-3xl border border-white/15 space-y-6 shadow-2xl">
            {currentQuestion?.questionType === 'poll' ? (
              <div className="space-y-3">
                <div className="text-7xl animate-bounce">📊</div>
                <h2 className="text-3xl font-black text-fuchsia-300">
                  תודה שהשתתפת בסקר!
                </h2>
              </div>
            ) : selectedIndex === correctOption ? (
              <div className="space-y-3">
                <div className="text-7xl animate-bounce">🎉</div>
                <h2 className="text-4xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">
                  תשובה נכונה!
                </h2>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-7xl animate-shake">❌</div>
                <h2 className="text-4xl font-black text-rose-400 drop-shadow-[0_0_15px_rgba(251,113,133,0.4)]">
                  תשובה שגויה
                </h2>
              </div>
            )}
            <p className="text-white/60 text-sm font-medium">
              המתן לשאלה הבאה מלוח המנחה...
            </p>
          </div>
        </div>
      )}

      {/* מסך סיום המשחק */}
      {step === 'GAME_OVER' && (
        <div className="w-full max-w-md text-center z-10 animate-scale-up">
          <div className="bg-[#130728]/80 backdrop-blur-2xl p-10 rounded-3xl border border-fuchsia-500/30 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="text-7xl animate-bounce">🏆</div>
            <div>
              <h2 className="text-4xl font-black bg-gradient-to-r from-fuchsia-300 to-violet-300 bg-clip-text text-transparent">
                המשחק הסתיים!
              </h2>
              <p className="text-white/70 text-sm mt-2 font-medium">
                תודה ששיחקת ב-MegaClick!
              </p>
            </div>
            <button
              onClick={resetToJoin}
              className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-base transition-all cursor-pointer shadow-lg"
            >
              שחק שוב 🔄
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
