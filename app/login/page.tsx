'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // State Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // Redirect if logged in
  useEffect(() => {
    const handleAuthRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      }
    };

    handleAuthRedirect();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        router.push('/dashboard');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Switch tabs and reset errors
  const switchTab = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    setIsForgotPassword(false);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
        setSuccessMsg('קישור לאיפוס סיסמה נשלח אל המייל שלך!');
        setLoading(false);
        return;
      }

      if (activeTab === 'signup') {
        if (!acceptTerms) {
          setErrorMsg('יש לאשר את תנאי השימוש ומדיניות הפרטיות');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: {
              phone: phone, // שמירת מספר הטלפון ב-Metadata של Supabase
            },
          },
        });
        if (error) throw error;
        setSuccessMsg('נרשמת בהצלחה! בדוק את תיבת המייל שלך לאישור החשבון.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'אירעה שגיאה, אנא נסה שנית');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Login
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
            
            {/* Top Title */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-black tracking-tight mb-2 bg-gradient-to-r from-fuchsia-300 via-pink-200 to-white bg-clip-text text-transparent">
                {isForgotPassword
                  ? 'איפוס סיסמה'
                  : activeTab === 'signup'
                  ? 'הרשמה ללא עלות!'
                  : 'ברוכים השבים!'}
              </h1>
              <p className="text-sm text-white/60 font-light">
                {isForgotPassword
                  ? 'הזן את המייל שלך ונשלח לך קישור לאיפוס'
                  : activeTab === 'signup'
                  ? 'צור חשבון והתחל ליצור משחקים בלייב'
                  : 'התחבר למערכת הניהול שלך'}
              </p>
            </div>

            {/* Segmented Control Tabs (כניסה / הרשמה) */}
            {!isForgotPassword && (
              <div className="flex bg-white/5 p-1.5 rounded-2xl mb-6 border border-white/10">
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                    activeTab === 'login'
                      ? 'bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-lg shadow-fuchsia-500/30'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  כניסה
                </button>
                <button
                  type="button"
                  onClick={() => switchTab('signup')}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                    activeTab === 'signup'
                      ? 'bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-lg shadow-fuchsia-500/30'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  הרשמה
                </button>
              </div>
            )}

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

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="אימייל"
                  className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/40 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all text-sm"
                />
              </div>

              {/* Phone (Only in SignUp) */}
              {activeTab === 'signup' && !isForgotPassword && (
                <div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="מספר טלפון"
                    className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/40 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all text-sm"
                  />
                </div>
              )}

              {/* Password */}
              {!isForgotPassword && (
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={activeTab === 'signup' ? 'בחר סיסמה שתשמש אותך לכניסה' : 'סיסמה'}
                    className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/40 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all text-sm pl-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors p-1"
                    aria-label="הצג/הסתר סיסמה"
                  >
                    {showPassword ? (
                      /* Eye Slash */
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    ) : (
                      /* Eye */
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              )}

              {/* Links under Login */}
              {activeTab === 'login' && !isForgotPassword && (
                <div className="flex items-center justify-between text-xs text-fuchsia-400 font-medium px-1 pt-1">
                  <button
                    type="button"
                    onClick={() => switchTab('signup')}
                    className="hover:text-fuchsia-300 transition-colors"
                  >
                    אין לך סיסמה עדיין? הירשם
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="hover:text-fuchsia-300 transition-colors"
                  >
                    שכחת את הסיסמה?
                  </button>
                </div>
              )}

              {/* Checkbox for SignUp */}
              {activeTab === 'signup' && !isForgotPassword && (
                <div className="flex items-center gap-2 text-xs text-white/70 pt-1 px-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.value ? e.target.checked : false)}
                    className="rounded border-white/20 bg-white/10 text-fuchsia-500 focus:ring-fuchsia-500 h-4 w-4 accent-fuchsia-500 cursor-pointer"
                  />
                  <label htmlFor="terms" className="cursor-pointer">
                    אני מסכים/ה לקבלת דיוור ול{' '}
                    <Link href="/privacy" className="text-fuchsia-400 underline hover:text-fuchsia-300">
                      מדיניות הפרטיות
                    </Link>
                  </label>
                </div>
              )}

              {/* Main Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-4 px-6 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white font-bold hover:from-fuchsia-400 hover:to-violet-500 shadow-lg shadow-fuchsia-500/30 transition-all duration-300 active:scale-95 disabled:opacity-50 text-base"
              >
                {loading
                  ? 'טוען...'
                  : isForgotPassword
                  ? 'שלח קישור לאיפוס'
                  : activeTab === 'signup'
                  ? 'הרשמה למערכת'
                  : 'כניסה'}
              </button>
            </form>

            {/* Back Link for Forgot Password */}
            {isForgotPassword && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-xs text-fuchsia-400 hover:text-fuchsia-300 font-bold transition-colors"
                >
                  ← חזרה למסך ההתחברות
                </button>
              </div>
            )}

            {/* Google OAuth Login */}
            {!isForgotPassword && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  type="button"
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold transition-all duration-300 active:scale-95 shadow-md text-sm"
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
              </div>
            )}

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
