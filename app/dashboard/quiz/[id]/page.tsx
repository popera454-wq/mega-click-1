'use client';

import React, { useState, useEffect } from 'react';
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

interface Quiz {
  id: string;
  title: string;
  description: string;
}

export default function EditQuizPage({ params }: { params: { id: string } }) {
  // גישה ישירה ל-id ללא שימוש ב-use()
  const quizId = params.id;

  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State for new question
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState<number>(0);
  const [timeLimit, setTimeLimit] = useState<number>(20);
  const [adding, setAdding] = useState(false);

  // 1. Load Quiz & Questions
  useEffect(() => {
    const fetchQuizData = async () => {
      setLoading(true);

      // Check User
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch Quiz Details
      const { data: quizData, error: quizErr } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizErr || !quizData) {
        alert('החידון לא נמצא או שאין לך הרשאה אליו');
        router.push('/dashboard');
        return;
      }

      setQuiz(quizData);

      // Fetch Questions
      const { data: qData, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: true });

      if (!qErr && qData) {
        setQuestions(qData);
      }

      setLoading(false);
    };

    if (quizId) {
      fetchQuizData();
    }
  }, [quizId, router]);

  // Update Option field
  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  // 2. Add New Question
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionText.trim()) {
      alert('נא להזין את תוכן השאלה');
      return;
    }

    if (options.some((opt) => !opt.trim())) {
      alert('נא למלא את כל 4 התשובות');
      return;
    }

    setAdding(true);

    try {
      const { data, error } = await supabase
        .from('questions')
        .insert([
          {
            quiz_id: quizId,
            question_text: questionText.trim(),
            options: options.map((o) => o.trim()),
            correct_option: correctOption,
            time_limit: timeLimit,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setQuestions([...questions, data]);

      // Reset Form
      setQuestionText('');
      setOptions(['', '', '', '']);
      setCorrectOption(0);
      setTimeLimit(20);
    } catch (err: any) {
      alert('שגיאה בהוספת השאלה: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  // 3. Delete Question
  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('האם למחוק שאלה זו?')) return;

    const { error } = await supabase.from('questions').delete().eq('id', qId);

    if (error) {
      alert('שגיאה במחיקת השאלה');
    } else {
      setQuestions(questions.filter((q) => q.id !== qId));
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen grid-bg bg-[#0d041e] text-white flex justify-center items-center dir-rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin" />
          <p className="text-white/60 font-light text-sm">טוען את החידון...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid-bg bg-[#0d041e] text-white dir-rtl pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#130728bb] px-6 py-4 backdrop-blur-xl md:px-12">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all text-sm"
          >
            → חזרה לדשבורד
          </Link>
          <span className="text-xl font-bold text-fuchsia-200 truncate max-w-[200px] md:max-w-md">
            עריכת: {quiz?.title}
          </span>
        </div>

        <Link
          href={`/host/${quizId}`}
          className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/30 transition-all text-sm"
        >
          הפעל משחק 🚀
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-6 pt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left/Main Column: Add Question Form */}
        <div className="lg:col-span-7">
          <div className="glass neon rounded-3xl p-6 md:p-8 border border-white/10">
            <h2 className="text-2xl font-bold mb-1 text-white">
              הוספת שאלה חדשה ✍️
            </h2>
            <p className="text-white/60 text-xs mb-6">
              הזן את נתוני השאלה וסמן את התשובה הנכונה.
            </p>

            <form onSubmit={handleAddQuestion} className="space-y-5">
              {/* Question Text */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">
                  תוכן השאלה *
                </label>
                <input
                  type="text"
                  required
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="מהי בירת צרפת?"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-400 transition-all text-sm"
                />
              </div>

              {/* Time Limit */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">
                  זמן למענה (בשניות)
                </label>
                <select
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-[#1d0b38] border border-white/10 text-white focus:outline-none focus:border-fuchsia-400 transition-all text-sm"
                >
                  <option value={10}>10 שניות</option>
                  <option value={20}>20 שניות (מומלץ)</option>
                  <option value={30}>30 שניות</option>
                  <option value={60}>60 שניות</option>
                </select>
              </div>

              {/* 4 Options */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-white/80">
                  תשובות (סמן את הנכונה):
                </label>

                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="correct_option"
                      checked={correctOption === idx}
                      onChange={() => setCorrectOption(idx)}
                      className="w-5 h-5 accent-fuchsia-500 cursor-pointer"
                      title="סמן כתשובה נכונה"
                    />
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`תשובה ${idx + 1}`}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none ${
                        correctOption === idx
                          ? 'bg-fuchsia-500/10 border-fuchsia-500 text-white'
                          : 'bg-white/5 border-white/10 text-white/80 placeholder-white/30'
                      }`}
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={adding}
                className="w-full mt-4 py-3.5 rounded-xl font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/25 transition-all text-sm disabled:opacity-50"
              >
                {adding ? 'מוסיף...' : '+ הוסף שאלה לחידון'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Existing Questions List */}
        <div className="lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">
              רשימת שאלות ({questions.length})
            </h3>
          </div>

          {questions.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center text-white/50 text-sm border border-white/10">
              עדיין לא הוספת שאלות לחידון זה.
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {questions.map((q, qIndex) => (
                <div
                  key={q.id}
                  className="glass rounded-2xl p-5 border border-white/10 relative group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-bold text-fuchsia-300 text-sm">
                      #{qIndex + 1}. {q.question_text}
                    </span>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="text-white/30 hover:text-red-400 transition-colors p-1"
                      title="מחק שאלה"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 mt-3 text-xs">
                    {q.options.map((opt, optIndex) => (
                      <div
                        key={optIndex}
                        className={`p-2 rounded-lg truncate ${
                          q.correct_option === optIndex
                            ? 'bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/40 font-bold'
                            : 'bg-white/5 text-white/60'
                        }`}
                      >
                        {optIndex + 1}. {opt}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 text-[10px] text-white/40 text-left">
                    ⏱️ {q.time_limit} שניות
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
