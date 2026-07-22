'use client';

import React, { useState, useEffect } from 'react';
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
  correct_range_value?: number | null;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
}

export default function EditQuizPage({ params }: { params: { id: string } }) {
  const quizId = params.id;
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [questionType, setQuestionType] = useState<Question['question_type']>('single_choice');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState<number>(0);
  const [correctOptions, setCorrectOptions] = useState<number[]>([]);
  const [minRange, setMinRange] = useState<number | ''>(0);
  const [maxRange, setMaxRange] = useState<number | ''>(100);
  const [correctRangeValue, setCorrectRangeValue] = useState<number | ''>(50);
  const [timeLimit, setTimeLimit] = useState<number>(20);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const fetchQuizData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

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

    if (quizId) fetchQuizData();
  }, [quizId, router]);

  // Handle Type Changes & Resets
  const handleTypeChange = (type: Question['question_type']) => {
    setQuestionType(type);
    if (type === 'true_false') {
      setOptions(['נכון', 'לא נכון']);
      setCorrectOption(0);
    } else if (type === 'single_choice' || type === 'poll') {
      setOptions(['', '', '', '']);
      setCorrectOption(0);
    } else if (type === 'multiple_correct') {
      setOptions(['', '', '', '']);
      setCorrectOptions([]);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const toggleMultipleCorrect = (index: number) => {
    if (correctOptions.includes(index)) {
      setCorrectOptions(correctOptions.filter(i => i !== index));
    } else {
      setCorrectOptions([...correctOptions, index]);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionText.trim()) {
      alert('נא להזין את תוכן השאלה');
      return;
    }

    if (questionType !== 'range' && options.some(opt => !opt.trim())) {
      alert('נא למלא את כל אפשרויות התשובה');
      return;
    }

    if (questionType === 'multiple_correct' && correctOptions.length === 0) {
      alert('נא לסמן לפחות תשובה אחת נכונה');
      return;
    }

    if (questionType === 'range' && (minRange === '' || maxRange === '' || correctRangeValue === '')) {
      alert('נא להגדיר טווח מספרים ואת התשובה הנכונה בטווח');
      return;
    }

    setAdding(true);

    try {
      const payload = {
        quiz_id: quizId,
        question_text: questionText.trim(),
        question_type: questionType,
        options: questionType === 'range' ? [] : options.map(o => o.trim()),
        correct_option: questionType === 'single_choice' || questionType === 'true_false' ? correctOption : null,
        correct_options: questionType === 'multiple_correct' ? correctOptions : [],
        min_range: questionType === 'range' ? Number(minRange) : null,
        max_range: questionType === 'range' ? Number(maxRange) : null,
        correct_range_value: questionType === 'range' ? Number(correctRangeValue) : null,
        time_limit: timeLimit,
      };

      const { data, error } = await supabase
        .from('questions')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setQuestions([...questions, data]);

      // Reset Form
      setQuestionText('');
      if (questionType === 'single_choice' || questionType === 'multiple_correct' || questionType === 'poll') {
        setOptions(['', '', '', '']);
      }
      setCorrectOption(0);
      setCorrectOptions([]);
      setMinRange(0);
      setMaxRange(100);
      setCorrectRangeValue(50);
      setTimeLimit(20);
    } catch (err: any) {
      alert('שגיאה בהוספת השאלה: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('האם למחוק שאלה זו?')) return;
    const { error } = await supabase.from('questions').delete().eq('id', qId);
    if (error) {
      alert('שגיאה במחיקת השאלה');
    } else {
      setQuestions(questions.filter(q => q.id !== qId));
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen grid-bg bg-[#0d041e] text-white flex justify-center items-center dir-rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin shadow-lg shadow-fuchsia-500/20" />
          <p className="text-white/60 font-medium text-sm">טוען את עריכת החידון...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid-bg bg-[#0d041e] text-white dir-rtl pb-24 selection:bg-fuchsia-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#130728]/80 px-6 py-4 backdrop-blur-2xl md:px-12 shadow-2xl">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all text-sm font-bold border border-white/5"
          >
            ← חזרה לדשבורד
          </Link>
          <span className="text-xl font-black bg-gradient-to-r from-fuchsia-200 to-white bg-clip-text text-transparent truncate max-w-[200px] md:max-w-md">
            עריכה: {quiz?.title}
          </span>
        </div>

        <Link
          href={`/host/${quizId}`}
          className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/30 transition-all text-sm hover:scale-105 active:scale-95"
        >
          הפעל משחק 🚀
        </Link>
      </header>

      <div className="max-w-7xl mx-auto px-6 pt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-7">
          <div className="glass neon rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-black mb-1 text-white">
              הוספת שאלה לטלפון 📞
            </h2>
            <p className="text-white/60 text-xs mb-6">
              בחר את פורמט השאלה שמתאים למשתתפים שמחייגים למערכת.
            </p>

            {/* Type Selector Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
              {[
                { id: 'single_choice', label: 'רב-בררה (אחת נכונה)' },
                { id: 'multiple_correct', label: 'כמה תשובות נכונות' },
                { id: 'true_false', label: 'נכון / לא נכון' },
                { id: 'poll', label: 'סקר (ללא ציון)' },
                { id: 'range', label: 'טווח מספרים (למשל 30-50)' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTypeChange(t.id as any)}
                  className={`p-3 text-xs font-bold rounded-2xl transition-all border ${
                    questionType === t.id
                      ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white border-fuchsia-400 shadow-lg shadow-fuchsia-500/20'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-5">
              {/* Question Text */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1.5">
                  תוכן השאלה <span className="text-fuchsia-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={questionType === 'range' ? 'למשל: בכמה שקלים נמכר המוצר?' : 'למשל: מהו צבע השמים?'}
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-400 focus:bg-white/10 transition-all text-sm"
                />
              </div>

              {/* Time Limit */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1.5">
                  זמן למענה (בשניות)
                </label>
                <select
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#1d0b38] border border-white/10 text-white focus:outline-none focus:border-fuchsia-400 transition-all text-sm"
                >
                  <option value={10}>10 שניות</option>
                  <option value={20}>20 שניות (מומלץ)</option>
                  <option value={30}>30 שניות</option>
                  <option value={60}>60 שניות</option>
                </select>
              </div>

              {/* Range Configuration */}
              {questionType === 'range' && (
                <div className="space-y-4 p-4 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-fuchsia-200 mb-1">ערך מינימלי</label>
                      <input
                        type="number"
                        required
                        value={minRange}
                        onChange={(e) => setMinRange(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-fuchsia-200 mb-1">ערך מקסימלי</label>
                      <input
                        type="number"
                        required
                        value={maxRange}
                        onChange={(e) => setMaxRange(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-fuchsia-200 mb-1">
                      🎯 התשובה הנכונה המדויקת (הקרוב ביותר יקבל ניקוד מקסימלי):
                    </label>
                    <input
                      type="number"
                      required
                      value={correctRangeValue}
                      onChange={(e) => setCorrectRangeValue(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="למשל: 42"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-fuchsia-500/50 text-white text-sm font-bold"
                    />
                  </div>

                  <div className="text-[11px] text-fuchsia-300">
                    💡 המשתתפים יקלידו מספר בטלפון ויסיימו בסולמית (#). המערכת תחשב אוטומטית מי הכי קרוב לתשובה הנכונה.
                  </div>
                </div>
              )}

              {/* Options Configuration */}
              {questionType !== 'range' && (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-white/80">
                    {questionType === 'multiple_correct'
                      ? 'סמן את כל התשובות הנכונות:'
                      : questionType === 'poll'
                      ? 'אפשרויות לבחירה בסקר (ללא תשובה נכונה):'
                      : 'אפשרויות תשובה (סמן את הנכונה):'}
                  </label>

                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      {questionType === 'multiple_correct' ? (
                        <input
                          type="checkbox"
                          checked={correctOptions.includes(idx)}
                          onChange={() => toggleMultipleCorrect(idx)}
                          className="w-5 h-5 accent-fuchsia-500 cursor-pointer rounded"
                          title="סמן כתשובה נכונה"
                        />
                      ) : questionType !== 'poll' ? (
                        <input
                          type="radio"
                          name="correct_option"
                          checked={correctOption === idx}
                          onChange={() => setCorrectOption(idx)}
                          className="w-5 h-5 accent-fuchsia-500 cursor-pointer"
                          title="סמן כתשובה נכונה"
                        />
                      ) : (
                        <span className="w-5 text-center text-xs text-white/40 font-bold">{idx + 1}</span>
                      )}

                      <input
                        type="text"
                        required={questionType !== 'true_false'}
                        readOnly={questionType === 'true_false'}
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`אפשרות למקש ${idx + 1}`}
                        className={`w-full px-4 py-3 rounded-2xl border text-sm transition-all focus:outline-none ${
                          (questionType === 'multiple_correct' && correctOptions.includes(idx)) ||
                          (questionType !== 'multiple_correct' && questionType !== 'poll' && correctOption === idx)
                            ? 'bg-fuchsia-500/15 border-fuchsia-500 text-white font-bold'
                            : 'bg-white/5 border-white/10 text-white/80 placeholder-white/30'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={adding}
                className="w-full mt-4 py-4 rounded-2xl font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-xl shadow-fuchsia-500/25 transition-all text-sm disabled:opacity-50 active:scale-95"
              >
                {adding ? 'מוסיף שאלה...' : '+ הוסף שאלה לחידון'}
              </button>
            </form>
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">
              שאלות בחידון ({questions.length})
            </h3>
          </div>

          {questions.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center text-white/50 text-sm border border-white/10">
              עדיין לא הוספת שאלות לחידון זה.
            </div>
          ) : (
            <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2">
              {questions.map((q, qIndex) => (
                <div
                  key={q.id}
                  className="glass rounded-3xl p-5 border border-white/10 relative group hover:border-fuchsia-500/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-2.5 py-1 rounded-lg bg-fuchsia-500/20 text-fuchsia-300 font-bold">
                        {q.question_type === 'multiple_correct' ? 'כמה נכונות' :
                         q.question_type === 'true_false' ? 'נכון/לא נכון' :
                         q.question_type === 'poll' ? 'סקר' :
                         q.question_type === 'range' ? 'טווח מספרים' : 'רב-בררה'}
                      </span>
                      <span className="font-bold text-white text-sm">
                        #{qIndex + 1}. {q.question_text}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="text-white/30 hover:text-red-400 transition-colors p-1.5 rounded-xl hover:bg-red-500/10"
                      title="מחק שאלה"
                    >
                      ✕
                    </button>
                  </div>

                  {q.question_type === 'range' ? (
                    <div className="mt-3 text-xs text-fuchsia-200 bg-fuchsia-500/10 p-3 rounded-xl space-y-1">
                      <div>📊 טווח מספרים: <strong>{q.min_range} עד {q.max_range}</strong></div>
                      <div>🎯 התשובה הנכונה: <strong className="text-emerald-400">{q.correct_range_value}</strong></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      {q.options.map((opt, optIndex) => {
                        const isCorrect =
                          q.question_type === 'multiple_correct'
                            ? q.correct_options?.includes(optIndex)
                            : q.correct_option === optIndex;

                        return (
                          <div
                            key={optIndex}
                            className={`p-2.5 rounded-xl truncate ${
                              isCorrect
                                ? 'bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-500/50 font-bold'
                                : 'bg-white/5 text-white/60'
                            }`}
                          >
                            מקש {optIndex + 1}: {opt}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-[11px] text-white/40 pt-2 border-t border-white/5">
                    <span>⏱️ {q.time_limit} שניות</span>
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
