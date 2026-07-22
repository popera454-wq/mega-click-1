'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Quiz {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();

  // States
  const [user, setUser] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Quiz Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. בדיקת אימות זהות וטעינת הנתונים
  useEffect(() => {
    const fetchUserDataAndQuizzes = async () => {
      setLoading(true);

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser(currentUser);

      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('שגיאה בטעינת החידונים:', error.message);
      } else {
        setQuizzes(data || []);
      }

      setLoading(false);
    };

    fetchUserDataAndQuizzes();
  }, [router]);

  // 2. יצירת חידון חדש ומעבר לעמוד עריכת שאלות
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from('quizzes')
        .insert([
          {
            title: newTitle.trim(),
            description: newDescription.trim(),
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // מעבר ישיר לעמוד עריכת השאלות של החידון החדש
      router.push(`/dashboard/quiz/${data.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'אירעה שגיאה ביצירת החידון');
      setCreating(false);
    }
  };

  // 3. מחיקת חידון
  const handleDeleteQuiz = async (quizId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('האם אתה בטוח שברצונך למחוק חידון זה? כל השאלות ימחקו לצמיתות.')) return;

    const { error } = await supabase.from('quizzes').delete().eq('id', quizId);

    if (error) {
      alert('שגיאה במחיקת החידון');
    } else {
      setQuizzes(quizzes.filter((q) => q.id !== quizId));
    }
  };

  // 4. התנתקות מהמערכת
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <main className="min-h-screen grid-bg bg-[#0d041e] text-white flex justify-center items-center dir-rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin shadow-lg shadow-fuchsia-500/20" />
          <p className="text-white/60 font-medium text-sm tracking-wide">
            טוען את המרחב שלך...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid-bg bg-[#0d041e] text-white dir-rtl pb-24 selection:bg-fuchsia-500 selection:text-white">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#130728]/80 px-6 py-4 backdrop-blur-2xl md:px-12 shadow-2xl">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-violet-500 text-white shadow-lg shadow-fuchsia-500/40 group-hover:scale-105 transition-transform">
            <svg
              className="w-6 h-6 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-fuchsia-300 via-pink-200 to-white bg-clip-text text-transparent">
            MegaClick
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-left text-xs bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
            <p className="text-white/40 font-medium">מחובר כ-</p>
            <p className="font-bold text-fuchsia-200 truncate max-w-[180px]">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 text-sm font-bold rounded-2xl bg-white/10 hover:bg-red-500/20 hover:border-red-500/40 border border-white/10 transition-all active:scale-95 text-white/80 hover:text-red-200"
          >
            יציאה
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 pt-12">
        {/* Title Bar & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12 bg-gradient-to-l from-fuchsia-950/20 via-transparent to-transparent p-8 rounded-3xl border border-white/5 shadow-inner">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-fuchsia-100 to-fuchsia-300 bg-clip-text text-transparent mb-2">
              החידונים שלי 🎮
            </h1>
            <p className="text-white/60 text-base font-light">
              נהל את החידונים שייצרת, ערוך שאלות או התחל משחק בלייב לקהל שלך.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-xl shadow-fuchsia-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-95 text-base"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            צור חידון חדש
          </button>
        </div>

        {/* Quizzes Grid / Empty State */}
        {quizzes.length === 0 ? (
          <div className="glass neon rounded-3xl p-16 text-center max-w-xl mx-auto my-12 border border-white/10 shadow-2xl">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-tr from-fuchsia-500/20 to-violet-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-300 shadow-inner">
              <svg
                className="w-10 h-10 animate-bounce"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              עדיין אין לך חידונים פעילים
            </h3>
            <p className="text-white/60 text-sm mb-8 leading-relaxed">
              זה הזמן ליצור את החידון הראשון שלך, להוסיף שאלות מרתקות ולהרים את האווירה עם חברים או קהל!
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-8 py-3.5 rounded-2xl font-bold bg-fuchsia-500 hover:bg-fuchsia-400 text-white shadow-lg shadow-fuchsia-500/30 transition-all hover:scale-105 active:scale-95 text-sm"
            >
              צור את החידון הראשון
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="glass neon rounded-3xl p-7 border border-white/10 flex flex-col justify-between hover:border-fuchsia-400/50 hover:shadow-2xl hover:shadow-fuchsia-500/10 transition-all duration-300 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h2 className="text-xl font-bold text-white group-hover:text-fuchsia-300 transition-colors line-clamp-1">
                      {quiz.title}
                    </h2>
                    <button
                      onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                      title="מחק חידון"
                      className="text-white/30 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-all"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="text-white/60 text-sm line-clamp-2 mb-8 font-light leading-relaxed">
                    {quiz.description || 'ללא תיאור מוגדר...'}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2 relative z-10">
                  <span className="text-xs font-medium text-white/40 bg-white/5 px-2.5 py-1 rounded-lg">
                    {new Date(quiz.created_at).toLocaleDateString('he-IL')}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/quiz/${quiz.id}`}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
                    >
                      עריכת שאלות
                    </Link>
                    <Link
                      href={`/host/${quiz.id}`}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-md shadow-fuchsia-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                      הפעל משחק 🚀
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create New Quiz */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md glass neon rounded-3xl p-8 border border-white/20 relative shadow-2xl animate-scale-up">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 left-6 text-white/50 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              ✕
            </button>

            <h2 className="text-2xl font-black mb-2 text-white">
              יצירת חידון חדש 🎯
            </h2>
            <p className="text-white/60 text-xs mb-6 leading-relaxed">
              תן כותרת ותיאור קצר לחידון שלך. לאחר מכן תועבר מיד לעמוד הוספת השאלות.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs font-medium flex items-center gap-2">
                <span>⚠️</span> {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1.5">
                  שם החידון <span className="text-fuchsia-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="למשל: חידון הידע הכללי של המשרד"
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-400 focus:bg-white/10 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1.5">
                  תיאור קצר (אופציונלי)
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="תיאור קצר על נושא החידון..."
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-400 focus:bg-white/10 transition-all text-sm resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 rounded-2xl text-sm font-bold bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-7 py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/25 transition-all disabled:opacity-50 active:scale-95"
                >
                  {creating ? 'יוצר חידון...' : 'צור והמשך לעריכה'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
