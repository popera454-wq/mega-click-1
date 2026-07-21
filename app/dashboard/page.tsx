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

      // בדיקת משתמש מחובר
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        // אם המשתמש לא מחובר - מעבירים אותו לדף התחברות
        router.push('/login');
        return;
      }

      setUser(currentUser);

      // טעינת החידונים האישיים של המשתמש בלבד
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

  // 2. יצירת חידון חדש
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

      // עדכון הליסט המקומי
      setQuizzes([data, ...quizzes]);

      // איפוס וסגירת המודל
      setNewTitle('');
      setNewDescription('');
      setIsModalOpen(false);

      // מעבר לעמוד עריכת השאלות של החידון החדש (נבנה בהמשך)
      // router.push(`/dashboard/quiz/${data.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'אירעה שגיאה ביצירת החידון');
    } finally {
      setCreating(false);
    }
  };

  // 3. מחיקת חידון
  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק חידון זה?')) return;

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
          <div className="w-10 h-10 border-4 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin" />
          <p className="text-white/60 font-light text-sm">
            טעון את החידונים שלך...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid-bg bg-[#0d041e] text-white dir-rtl pb-20">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#130728bb] px-6 py-4 backdrop-blur-xl md:px-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-fuchsia-500 to-violet-500 text-white shadow-md shadow-fuchsia-500/30">
            <svg
              className="w-5 h-5 animate-pulse"
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
          <span className="text-2xl font-black bg-gradient-to-r from-fuchsia-300 via-pink-200 to-white bg-clip-text text-transparent">
            MegaClick
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-left text-xs">
            <p className="text-white/50">מחובר כ-</p>
            <p className="font-bold text-fuchsia-200 truncate max-w-[150px]">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-bold rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all active:scale-95 text-white/80 hover:text-white"
          >
            יציאה
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 pt-10">
        {/* Title Bar & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-white via-fuchsia-100 to-fuchsia-300 bg-clip-text text-transparent">
              החידונים שלי 🎮
            </h1>
            <p className="text-white/60 text-sm mt-1">
              נהל את החידונים שייצרת או צור חידון חדש בלחיצה.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/30 transition-all duration-200 active:scale-95 text-sm md:text-base"
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
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            צור חידון חדש
          </button>
        </div>

        {/* Quizzes Grid / Empty State */}
        {quizzes.length === 0 ? (
          <div className="glass neon rounded-3xl p-12 text-center max-w-xl mx-auto my-12 border border-white/10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-300">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              עדיין אין לך חידונים
            </h3>
            <p className="text-white/60 text-sm mb-6">
              זה הזמן ליצור את החידון הראשון שלך ולהרים את האווירה לחברים או
              לקהל!
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 rounded-xl font-bold bg-fuchsia-500 hover:bg-fuchsia-400 text-white shadow-md transition-all text-sm"
            >
              צור את החידון הראשון
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="glass neon rounded-3xl p-6 border border-white/10 flex flex-col justify-between hover:border-fuchsia-400/40 transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h2 className="text-xl font-bold text-white group-hover:text-fuchsia-300 transition-colors line-clamp-1">
                      {quiz.title}
                    </h2>
                    <button
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      title="מחק חידון"
                      className="text-white/30 hover:text-red-400 p-1 transition-colors"
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
                  <p className="text-white/60 text-sm line-clamp-2 mb-6 font-light">
                    {quiz.description || 'ללא תיאור'}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                  <span className="text-xs text-white/40">
                    {new Date(quiz.created_at).toLocaleDateString('he-IL')}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/quiz/${quiz.id}`}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all"
                    >
                      עריכת שאלות
                    </Link>
                    <Link
                      href={`/host/${quiz.id}`}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-md transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md glass neon rounded-3xl p-8 border border-white/20 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 left-5 text-white/50 hover:text-white transition-colors"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-2 text-white">
              יצירת חידון חדש 🎯
            </h2>
            <p className="text-white/60 text-xs mb-6">
              תן כותרת ותיאור קצר לחידון שלך. לאחר מכן תוכל להוסיף שאלות.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">
                  שם החידון *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="למשל: חידון הידע הכללי של המשרד"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-400 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">
                  תיאור קצר (אופציונלי)
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="תיאור קצר על נושא החידון..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-400 transition-all text-sm resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 text-white/70"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/25 transition-all disabled:opacity-50"
                >
                  {creating ? 'יוצר...' : 'צור חידון'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
