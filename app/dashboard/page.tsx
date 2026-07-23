'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Quiz {
  id: string;
  title: string;
  description: string;
  created_at: string;
  user_id: string;
}

export default function DashboardPage() {
  const router = useRouter();

  // States
  const [user, setUser] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create Quiz Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. אימות משתמש שטעינת חידונים
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

  // סינון חידונים לפי חיפוש
  const filteredQuizzes = useMemo(() => {
    if (!searchQuery.trim()) return quizzes;
    return quizzes.filter(
      (quiz) =>
        quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (quiz.description && quiz.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [quizzes, searchQuery]);

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

      router.push(`/dashboard/quiz/${data.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'אירעה שגיאה ביצירת החידון');
      setCreating(false);
    }
  };

  // 3. שכפול חידון
  const handleDuplicateQuiz = async (quiz: Quiz, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .insert([
          {
            title: `${quiz.title} (עותק)`,
            description: quiz.description,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setQuizzes([data, ...quizzes]);
    } catch (err: any) {
      alert('שגיאה בשכפול החידון');
    }
  };

  // 4. העתקת קישור לשיתוף
  const handleShareQuiz = (quizId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const shareUrl = `${window.location.origin}/join?code=${quizId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(quizId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 5. מחיקת חידון
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

  // 6. התנתקות
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
            טוען את המשחקים שלך...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid-bg bg-[#0d041e] text-white dir-rtl pb-24 selection:bg-fuchsia-500 selection:text-white relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#0d041e]/80 px-6 py-4 backdrop-blur-2xl md:px-12 shadow-2xl">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-fuchsia-500 to-violet-500 text-white shadow-lg shadow-fuchsia-500/30 group-hover:scale-105 transition-transform">
            ✦
          </div>
          <span className="text-2xl font-black bg-gradient-to-r from-fuchsia-300 via-pink-200 to-white bg-clip-text text-transparent">
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
            className="px-4 py-2 text-xs md:text-sm font-bold rounded-2xl bg-white/5 hover:bg-red-500/20 hover:border-red-500/40 border border-white/10 transition-all active:scale-95 text-white/80 hover:text-red-200"
          >
            יציאה
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 pt-10">
        
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-fuchsia-100 to-fuchsia-300 bg-clip-text text-transparent mb-3">
            המשחקים שלי 🎮
          </h1>
          <p className="text-white/60 text-sm md:text-base font-light">
            נהל את כל החידונים והמשחקים שלך במקום אחד
          </p>
        </div>

        {/* Action & Search Bar Container */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10 max-w-4xl mx-auto">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש משחקים..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 pr-11 text-sm text-white placeholder-white/40 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all"
            />
            <svg
              className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Create Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-xl shadow-fuchsia-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-95 text-sm"
          >
            <span className="text-lg leading-none">+</span>
            <span>צור משחק חדש</span>
          </button>
        </div>

        {/* Quizzes Grid / Empty State */}
        {filteredQuizzes.length === 0 ? (
          <div className="glass neon rounded-3xl p-12 text-center max-w-md mx-auto my-8 border border-white/10 shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-300 shadow-inner">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {searchQuery ? 'לא נמצאו משחקים תואמים' : 'עדיין אין לך משחקים'}
            </h3>
            <p className="text-white/60 text-xs mb-6 leading-relaxed">
              {searchQuery
                ? 'נסה לחפש בשם אחר או נקה את שדה החיפוש.'
                : 'צור את המשחק הראשון שלך והתחל להפעיל חידונים בלייב!'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 rounded-xl font-bold bg-fuchsia-500 hover:bg-fuchsia-400 text-white shadow-lg shadow-fuchsia-500/30 transition-all text-xs"
              >
                צור משחק ראשון
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="glass neon rounded-3xl border border-white/10 flex flex-col justify-between hover:border-fuchsia-500/40 hover:shadow-2xl hover:shadow-fuchsia-500/10 transition-all duration-300 group overflow-hidden"
              >
                {/* Top Card Banner / Mock Screen */}
                <div className="h-32 bg-gradient-to-br from-violet-900/40 via-fuchsia-950/30 to-[#0d041e] border-b border-white/10 p-4 relative flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] text-white/50 font-medium">
                    <span>נוצר ב: {new Date(quiz.created_at).toLocaleDateString('he-IL')}</span>
                    <span className="bg-fuchsia-500/20 text-fuchsia-300 px-2 py-0.5 rounded-full border border-fuchsia-500/30">
                      פעיל
                    </span>
                  </div>
                  
                  {/* Visual Decorative Game Badge */}
                  <div className="self-center my-auto flex items-center gap-2 text-fuchsia-300/80 font-black text-sm tracking-wider uppercase">
                    <span>✦ MegaClick Live</span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white group-hover:text-fuchsia-200 transition-colors line-clamp-1 mb-2">
                      {quiz.title}
                    </h2>
                    <p className="text-white/60 text-xs line-clamp-2 font-light leading-relaxed mb-6">
                      {quiz.description || 'ללא תיאור מוגדר...'}
                    </p>
                  </div>

                  {/* Actions Toolbar (בדומה לתפריט המהיר מכרטיסיות המתחרה) */}
                  <div>
                    <div className="flex items-center justify-between border-t border-b border-white/10 py-2.5 mb-5 px-1">
                      {/* Edit Button */}
                      <Link
                        href={`/dashboard/quiz/${quiz.id}`}
                        className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                        title="עריכת שאלות"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 210.3H3v-3.572L16.732 3.732z" />
                        </svg>
                      </Link>

                      {/* Share Button */}
                      <button
                        onClick={(e) => handleShareQuiz(quiz.id, e)}
                        className="p-2 text-white/60 hover:text-fuchsia-300 hover:bg-white/10 rounded-xl transition-all relative"
                        title="העתק קישור לשיתוף"
                      >
                        {copiedId === quiz.id ? (
                          <span className="text-[10px] text-emerald-400 font-bold">הועתק!</span>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        )}
                      </button>

                      {/* Duplicate Button */}
                      <button
                        onClick={(e) => handleDuplicateQuiz(quiz, e)}
                        className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                        title="שכפל משחק"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                        className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        title="מחק משחק"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Launch Game Button */}
                    <Link
                      href={`/host/${quiz.id}`}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:scale-[1.02] active:scale-95 text-xs"
                    >
                      <span>הפעל משחק בלייב</span>
                      <span>🚀</span>
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
          <div className="w-full max-w-md glass neon rounded-3xl p-8 border border-white/20 relative shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 left-6 text-white/50 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              ✕
            </button>

            <h2 className="text-2xl font-black mb-2 text-white">
              צור משחק חדש 🎯
            </h2>
            <p className="text-white/60 text-xs mb-6 leading-relaxed">
              הזן שם ותיאור קצר. לאחר מכן תעבור מיד למסך הוספת השאלות.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
                <span>⚠️</span> {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1.5">
                  שם המשחק <span className="text-fuchsia-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="למשל: חידון טריוויה שבועי"
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-400 focus:bg-white/10 transition-all text-sm"
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
                  placeholder="תיאור קצר על נושא המשחק..."
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-400 focus:bg-white/10 transition-all text-sm resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/25 transition-all disabled:opacity-50 active:scale-95"
                >
                  {creating ? 'יוצר...' : 'צור והמשך לעריכה'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
