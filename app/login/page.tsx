'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// אתחול לקוח Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  // שדות טופס
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // מצבי מערכת
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // בדיקת סשן והאזנה לשינויי התחברות
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

  // איפוס הודעות בעת החלפת טאב
  const switchTab = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    setIsForgotPassword(false);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // טיפול בשליחת הטופס (התחברות / הרשמה / איפוס סיסמה)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // 1. מצב איפוס סיסמה
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
        setSuccessMsg('קישור לאיפוס סיסמה נשלח אל המייל שלך!');
        setLoading(false);
        return;
      }

      // 2. מצב הרשמה
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
              phone: phone, // שמירת הטלפון ב-User Metadata
            },
          },
        });
        if (error) throw error;
        setSuccessMsg('נרשמת בהצלחה! בדוק את תיבת המייל שלך לאישור החשבון.');
      } 
      // 3. מצב התחברות
      else {
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

  // התחברות דרך Google
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
    <main className="min-h-screen bg-slate-50 text-slate-800 dir-rtl flex flex-col justify-between items-center py-8 px-4 relative overflow-hidden font-sans">
      
      {/* Header Logo */}
      <div className="flex flex-col items-center mb-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-3xl font-bold shadow-lg">
            🦉
          </div>
        </Link>
      </div>

      {/* Auth Card Container */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-10 z-10 transition-all">
        
        {/* Title */}
        <h1 className="text-2xl font-black text-center text-emerald-600 mb-6">
          {isForgotPassword ? 'איפוס סיסמה' : 'הרשמה ללא עלות!'}
        </h1>

        {/* Toggle Switcher Tabs */}
        {!isForgotPassword && (
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 border border-slate-200/60">
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                activeTab === 'login'
                  ? 'bg-[#1e293b] text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              כניסה
            </button>
            <button
              type="button"
              onClick={() => switchTab('signup')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                activeTab === 'signup'
                  ? 'bg-[#1e293b] text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              הרשמה
            </button>
          </div>
        )}

        {/* Error / Success Messages */}
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold text-center">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email Field */}
          <div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="אימייל"
              className="w-full rounded-2xl bg-slate-100/80 border-0 px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all text-sm outline-none"
            />
          </div>

          {/* Phone Field (SignUp Only) */}
          {activeTab === 'signup' && !isForgotPassword && (
            <div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="מספר טלפון"
                className="w-full rounded-2xl bg-slate-100/80 border-0 px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all text-sm outline-none"
              />
            </div>
          )}

          {/* Password Field */}
          {!isForgotPassword && (
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={activeTab === 'signup' ? 'בחר סיסמה שתשמש אותך לכניסה' : 'סיסמה'}
                className="w-full rounded-2xl bg-slate-100/80 border-0 px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all text-sm outline-none pl-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label="הצג/הסתר סיסמה"
              >
                {showPassword ? (
                  /* Eye Slash Icon */
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  /* Eye Icon */
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {/* Login Extra Options */}
          {activeTab === 'login' && !isForgotPassword && (
            <div className="flex items-center justify-between text-xs text-sky-600 font-semibold px-1 py-1">
              <button
                type="button"
                onClick={() => switchTab('signup')}
                className="hover:underline"
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
                className="hover:underline"
              >
                שכחת את הסיסמה?
              </button>
            </div>
          )}

          {/* SignUp Terms Checkbox */}
          {activeTab === 'signup' && !isForgotPassword && (
            <div className="flex items-center gap-2 text-xs text-slate-600 pt-1 px-1">
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="rounded text-rose-500 focus:ring-rose-400 h-4 w-4 border-slate-300 accent-rose-500 cursor-pointer"
              />
              <label htmlFor="terms" className="cursor-pointer">
                אני מסכים/ה לקבלת דיוור ול{' '}
                <Link href="/privacy" className="text-sky-600 underline">
                  מדיניות הפרטיות
                </Link>
              </label>
            </div>
          )}

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3.5 px-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-base shadow-lg shadow-rose-500/25 transition-all duration-200 active:scale-98 disabled:opacity-50 cursor-pointer"
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

        {/* Back from Forgot Password */}
        {isForgotPassword && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsForgotPassword(false)}
              className="text-xs text-sky-600 font-bold hover:underline"
            >
              ← חזרה למסך ההתחברות
            </button>
          </div>
        )}

        {/* Google OAuth Button */}
        {!isForgotPassword && (
          <div className="mt-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-white hover:bg-slate-50 border border-slate-200 font-semibold text-slate-700 transition-all text-xs shadow-sm cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              התחבר באמצעות GOOGLE
            </button>
          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} MegaClick. כל הזכויות שמורות.</p>
      </footer>
    </main>
  );
}
