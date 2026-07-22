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
  options: string[];
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

  const submitAnswer = async (optionIndex: number) => {
    if (selectedIndex !== null || !currentQuestion) return;

    const timeTaken = (Date.now() - startTime) / 1000;
    setSelectedIndex(optionIndex);
    setStep('ANSWERED');

    // שמירת תשובת האתר ב-DB
    await supabase.from('game_answers').insert({
      game_pin: pin,
      phone: playerId,
      answer_index: optionIndex,
      question_index: currentQuestion.questionIndex,
    });

    // שידור למנחה ב-Broadcast
    channelRef.current?.send({
      type: 'broadcast',
      event: 'SUBMIT_ANSWER',
      payload: {
        playerId,
        answerIndex: optionIndex,
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
    <main className="min-h-screen grid-bg bg-[#0d041e] text-white dir-rtl flex flex-col justify-center items-center p-4 select-none">
      {step === 'JOIN' && (
        <form
          onSubmit={joinGame}
          className="glass p-8 rounded-3xl border border-white/10 w-full max-w-md text-center space-y-6"
        >
          <h1 className="text-4xl font-black text-fuchsia-400">MegaClick ⚡</h1>
          <p className="text-white/60 text-sm">הזן קוד משחק ושם כדי להצטרף</p>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}

          <input
            type="number"
            placeholder="קוד משחק (PIN)"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full text-center text-2xl tracking-widest font-bold py-3 rounded-2xl bg-white/5 border border-white/20 focus:border-fuchsia-500 outline-none"
          />

          <input
            type="text"
            placeholder="השם שלך"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full text-center text-lg font-bold py-3 rounded-2xl bg-white/5 border border-white/20 focus:border-fuchsia-500 outline-none"
          />

          <button
            type="submit"
            className="w-full py-4 rounded-2xl font-black text-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 shadow-lg shadow-fuchsia-500/30 active:scale-95 transition-all"
          >
            כנס למשחק 🎮
          </button>
        </form>
      )}

      {step === 'WAITING' && (
        <div className="text-center space-y-4 animate-in zoom-in duration-300">
          <div className="w-20 h-20 mx-auto rounded-full bg-fuchsia-500/20 border-2 border-fuchsia-500 flex items-center justify-center text-3xl animate-bounce">
            ⏳
          </div>
          <h2 className="text-2xl font-bold">אתה בפנים, {playerName}!</h2>
          <p className="text-white/60">המתן שהמנחה יתחיל את המשחק...</p>
        </div>
      )}

      {step === 'QUESTION' && currentQuestion && (
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <span className="text-xs text-fuchsia-400 font-bold">
              שאלה {currentQuestion.questionIndex + 1}
            </span>
            <h2 className="text-xl font-bold mt-1">
              {currentQuestion.questionText}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {currentQuestion.options.map((opt, i) => {
              const colors = [
                'bg-red-500/80 hover:bg-red-500 border-red-400',
                'bg-blue-500/80 hover:bg-blue-500 border-blue-400',
                'bg-amber-500/80 hover:bg-amber-500 border-amber-400',
                'bg-emerald-500/80 hover:bg-emerald-500 border-emerald-400',
              ];
              return (
                <button
                  key={i}
                  onClick={() => submitAnswer(i)}
                  className={`p-6 rounded-2xl font-black text-xl border-2 text-white shadow-lg active:scale-95 transition-all ${
                    colors[i % 4]
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 'ANSWERED' && (
        <div className="text-center space-y-4">
          <div className="text-5xl">👍</div>
          <h2 className="text-2xl font-bold">התשובה נשלחה!</h2>
          <p className="text-white/60">מחכים ליתר השחקנים ותום הזמן...</p>
        </div>
      )}

      {step === 'SHOW_RESULT' && (
        <div className="text-center space-y-4">
          {selectedIndex === correctOption ? (
            <div className="space-y-2">
              <div className="text-6xl">🎉</div>
              <h2 className="text-3xl font-black text-emerald-400">
                תשובה נכונה!
              </h2>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-6xl">❌</div>
              <h2 className="text-3xl font-black text-red-400">תשובה שגויה</h2>
            </div>
          )}
          <p className="text-white/60">המתן לשאלה הבאה מלוח המנחה...</p>
        </div>
      )}

      {step === 'GAME_OVER' && (
        <div className="text-center space-y-4">
          <div className="text-6xl">🏆</div>
          <h2 className="text-3xl font-black text-fuchsia-400">
            המשחק הסתיים!
          </h2>
          <p className="text-white/60">תודה ששיחקת ב-MegaClick!</p>
          <button
            onClick={resetToJoin}
            className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-sm font-bold cursor-pointer hover:bg-white/20 transition-all"
          >
            שחק שוב
          </button>
        </div>
      )}
    </main>
  );
}
