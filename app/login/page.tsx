'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client directly for browser usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // Handle Google / Hash tokens redirect automatically on load
  useEffect(() => {
    // Check if user is already logged in or if tokens exist in URL hash
    const handleAuthRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      }
    };

    handleAuthRedirect();

    // Listen to auth state changes (e.g. when OAuth tokens are processed from URL hash)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        router.push('/dashboard');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Handle Email/Password Login or Sign Up
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (isForgotPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('קישור לאיפוס סיסמה נשלח אל המייל שלך!');
      }
      setLoading(false);
      return;
    }

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('נרשמת בהצלחה! בדוק את תיבת המייל שלך לאישור החשבון.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setErrorMsg(error.message);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    }
    setLoading(false);
  };

  // Handle Google OAuth Login
  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid-bg bg-[#0d041e] text-white dir-rtl flex flex-col justify-between selection:bg-fuchsia-500 selection:text-white relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 bg-[#0d041e]/80 px-6 py-4 backdrop-blur-xl md:px-16 z-20">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-fuchsia-500 to-violet-500 text-white shadow-lg shadow-fuchsia-500/30 group-hover:scale-105 transition-transform">
            ✦
          </div>
          <span className="text-2xl font-black bg-gradient-to-r from-fuchsia-300 via-pink-200 to-white bg-clip-text text-transparent">
            MegaClick
          </span>
        </Link>
        <Link
          href="/"
          className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-1.5"
        >
          ← חזרה לדף הבית
        </Link>
      </header>

      {/* Auth Card Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 z-10">
        <div className="w-full max-w-md">
          <div className="glass neon rounded-[2.5rem] p-8 md:p-10 border border-white/10 shadow-2xl relative">
            
            {/* Top Icon / Title */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black tracking-tight mb-2">
                {isForgotPassword
                  ? 'איפוס סיסמה'
                  : isSignUp
                  ? 'יצירת חשבון חדש'
                  : 'ברוכים השבים!'}
              </h1>
              <p className="text-sm text-white/60 font-light">
                {isForgotPassword
                  ? 'הזן את המייל שלך ונשלח לך קישור לאיפוס הסיסמה'
                  : isSignUp
                  ? 'הירשם כדי להתחיל ליצור ולנהל חידונים בלייב'
                  : 'התחבר למערכת הניהול של משחקי הטריוויה שלך'}
              </p>
            </div>

            {/* Error / Success Messages */}
            {errorMsg && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm text-center">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm text-center">
                {successMsg}
              </div>
            )}

            {/* Google Login Button */}
            {!isForgotPassword && (
              <>
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  type="button"
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold transition-all duration-300 active:scale-95 shadow-md mb-6 text-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.6 6.4C.6 8.4 0 10.6 0 13s.6 4.6 1.6 6.6l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 15.9C3.5 19.7 7.4 23 12 23z"
                    />
                  </svg>
                  התחברות באמצעות Google
                </button>

                <div className="flex items-center my-6 text-white/30 text-xs">
                  <div className="flex-1 border-t border-white/10" />
                  <span className="px-3">או באמצעות אימייל</span>
                  <div className="flex-1 border-t border-white/10" />
                </div>
              </>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5">
                  כתובת אימייל
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all text-sm"
                />
              </div>

              {!isForgotPassword && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-white/70">
                      סיסמה
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="text-xs text-fuchsia-400 hover:text-fuchsia-300 transition-colors"
                      >
                        שכחת סיסמה?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all text-sm"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white font-bold hover:from-fuchsia-400 hover:to-violet-500 shadow-lg shadow-fuchsia-500/30 transition-all duration-300 active:scale-95 disabled:opacity-50 text-base"
              >
                {loading
                  ? 'טוען...'
                  : isForgotPassword
                  ? 'שלח קישור לאיפוס'
                  : isSignUp
                  ? 'צור חשבון'
                  : 'התחברות'}
              </button>
            </form>

            {/* Toggle Modes Footer */}
            <div className="mt-8 text-center text-sm">
              {isForgotPassword ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-fuchsia-400 hover:text-fuchsia-300 font-bold transition-colors"
                >
                  ← חזרה למסך ההתחברות
                </button>
              ) : isSignUp ? (
                <p className="text-white/60">
                  כבר יש לך חשבון?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-fuchsia-400 hover:text-fuchsia-300 font-bold transition-colors underline"
                  >
                    התחבר כאן
                  </button>
                </p>
              ) : (
                <p className="text-white/60">
                  אין לך חשבון עדיין?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-fuchsia-400 hover:text-fuchsia-300 font-bold transition-colors underline"
                  >
                    הירשם בחינם
                  </button>
                </p>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-white/40 z-20">
        <p>© {new Date().getFullYear()} MegaClick. כל הזכויות שמורות.</p>
      </footer>
    </main>
  );
}
