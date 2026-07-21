'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        // הרשמה ל-Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        // אם מוגדר אישור אימייל ב-Supabase
        if (data?.user && data.session === null) {
          setSuccessMessage(
            'הרשמה בוצעה בהצלחה! אנא בדוק את תיבת הדוא"ל שלך לאישור החשבון.'
          );
        } else {
          setSuccessMessage('נרשמת בהצלחה! מעביר אותך ללוח הבקרה...');
          setTimeout(() => router.push('/dashboard'), 1500);
        }
      } else {
        // התחברות ל-Supabase Auth
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push('/dashboard');
      }
    } catch (err: any) {
      // תרגום שגיאות שכיחות לעברית
      let message = err.message || 'אירעה שגיאה בתהליך. אנא נסה שנית.';
      if (message.includes('Invalid login credentials')) {
        message = 'אימייל או סיסמה שגויים.';
      } else if (message.includes('User already registered')) {
        message = 'משתמש עם כתובת אימייל זו כבר קיים במערכת.';
      } else if (message.includes('Password should be at least')) {
        message = 'הסיסמה חייבת להכיל לפחות 6 תווים.';
      }
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid-bg bg-[#0d041e] text-white flex flex-col justify-center items-center px-4 py-12 dir-rtl">
      {/* Header / Logo */}
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-violet-500 text-white shadow-lg shadow-fuchsia-500/30">
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
          <span className="text-3xl font-black bg-gradient-to-r from-fuchsia-300 via-pink-200 to-white bg-clip-text text-transparent">
            MegaClick
          </span>
        </Link>
        <p className="text-white/60 font-light text-sm md:text-base">
          {isSignUp
            ? 'צור חשבון חדש והתחל ליצור חידונים'
            : 'התחבר לחשבון שלך כדי לנהל את המשחקים'}
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md glass neon rounded-3xl p-8 backdrop-blur-xl border border-white/10 relative overflow-hidden">
        {/* Toggle Sign In / Sign Up */}
        <div className="flex bg-white/5 p-1 rounded-xl mb-6 border border-white/10">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              !isSignUp
                ? 'bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            התחברות
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              isSignUp
                ? 'bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            הרשמה
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm font-medium">
            ⚠️ {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm font-medium">
            ✅ {successMessage}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                שם מלא
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ישראל ישראלי"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-400 focus:ring-1 focus:ring-fuchsia-400 transition-all text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-white/80 mb-1">
              דוא"ל
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-400 focus:ring-1 focus:ring-fuchsia-400 transition-all text-sm dir-ltr text-right"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/80 mb-1">
              סיסמה
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-400 focus:ring-1 focus:ring-fuchsia-400 transition-all text-sm dir-ltr text-right"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-base flex justify-center items-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isSignUp ? (
              'צור חשבון'
            ) : (
              'התחבר'
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 text-center text-xs text-white/50">
          <Link href="/" className="hover:text-fuchsia-300 transition-colors">
            ← חזרה לעמוד הבית
          </Link>
        </div>
      </div>
    </main>
  );
}
