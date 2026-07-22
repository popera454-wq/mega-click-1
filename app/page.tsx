'use client';

import React from 'react';
import Link from 'next/link';

// Custom Button Component
function Button({
  href,
  children,
  kind = 'primary',
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  kind?: 'primary' | 'secondary' | 'ghost';
  className = '',
}) {
  const baseStyle =
    'inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-all duration-300 active:scale-95 py-3.5 px-7 text-base shadow-lg';

  const styles = {
    primary:
      'bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white hover:from-fuchsia-400 hover:to-violet-500 shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50 hover:-translate-y-0.5',
    secondary:
      'bg-white text-slate-950 hover:bg-slate-100 shadow-white/10 hover:shadow-white/20 hover:-translate-y-0.5',
    ghost: 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 backdrop-blur-md',
  };

  return (
    <Link href={href} className={`${baseStyle} ${styles[kind]} ${className}`}>
      {children}
    </Link>
  );
}

// SVG Icons
const Icons = {
  Sparkles: () => (
    <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Zap: () => (
    <svg className="w-7 h-7 text-fuchsia-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Users: () => (
    <svg className="w-7 h-7 text-fuchsia-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Layers: () => (
    <svg className="w-7 h-7 text-fuchsia-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  Gamepad: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Phone: () => (
    <svg className="w-7 h-7 text-fuchsia-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
};

const features = [
  {
    Icon: Icons.Zap,
    t: 'אנרגיה בחדר בלייב',
    d: 'טיימרים דינמיים, אפקטים קוליים וחזותיים שמעלים את הדופק בכל שאלה.',
  },
  {
    Icon: Icons.Users,
    t: 'כולם משתתפים בקלות',
    d: 'מהסמארטפון דרך הדפדפן או בשיחת טלפון קולית (IVR) — בלי הורדות.',
  },
  {
    Icon: Icons.Layers,
    t: 'בונים שאלון בדקות',
    d: 'ממשק ניהול נוח במיוחד ליצירת שאלות, תשובות וניהול מנחה מלא.',
  },
];

const steps = [
  { num: '01', title: 'יוצרים שאלון', desc: 'בוחרים שאלות, הגדרות זמן ואפשרויות בקלות ממערכת הניהול.' },
  { num: '02', title: 'מציגים על המסך', desc: 'המנחה מקרין את המשחק עם קוד PIN ייחודי שנוצר אוטומטית.' },
  { num: '03', title: 'משחקים ומנצחים', desc: 'השתתפות מרהיבה מהנייד או בטלפון עם טבלת מובילים חיה בזמן אמת.' },
];

export default function Home() {
  return (
    <main className="min-h-screen grid-bg bg-[#0d041e] text-white dir-rtl selection:bg-fuchsia-500 selection:text-white overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#0d041e]/80 px-6 py-4 backdrop-blur-xl md:px-16">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-violet-500 text-white shadow-lg shadow-fuchsia-500/30">
            <Icons.Sparkles />
          </div>
          <span className="text-2xl font-black bg-gradient-to-r from-fuchsia-300 via-pink-200 to-white bg-clip-text text-transparent tracking-tight">
            MegaClick
          </span>
        </div>

        <nav className="flex items-center gap-3">
          <Button href="/play" kind="ghost" className="px-4 py-2.5 text-sm">
            הצטרפות למשחק
          </Button>
          <Button href="/login" className="px-4 py-2.5 text-sm">
            יצירת משחק
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="mx-auto grid min-h-[80vh] max-w-7xl items-center gap-12 px-6 py-16 md:grid-cols-2">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-2 text-sm text-fuchsia-200 backdrop-blur-md shadow-inner">
            <span className="animate-pulse">✦</span> הפלטפורמה המובילה לחידונים ומשחקים בלייב
          </div>
          <h1 className="text-5xl font-black leading-[1.1] md:text-7xl tracking-tight">
            הופכים כל מפגש
            <br />
            <span className="bg-gradient-to-l from-fuchsia-300 via-pink-400 to-violet-400 bg-clip-text text-transparent">
              לחויה מחושמלת.
            </span>
          </h1>
          <p className="max-w-xl text-lg md:text-xl leading-relaxed text-white/70 font-light">
            MegaClick מעוררת לחיים כיתות לימוד, אירועים חברתיים ומפגשי צוות עם טריוויה מהירה, אינטראקטיבית ובזמן אמת.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Button href="/login">
              <span>התחל בחינם</span>
              <Icons.ArrowLeft />
            </Button>
            <Button href="/play" kind="ghost">
              יש לי קוד PIN
            </Button>
          </div>
        </div>

        {/* Live Quiz Card Mockup */}
        <div className="relative animate-float">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-fuchsia-500 to-violet-600 rounded-[2.5rem] blur-xl opacity-30 -z-10" />
          <div className="glass neon rounded-[2.5rem] p-6 md:p-10 transition-all duration-300 border border-white/10">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/40">
                  <Icons.Gamepad />
                </span>
                <div>
                  <b className="text-lg block">חידון הידע הכללי</b>
                  <p className="text-xs text-fuchsia-300 font-medium">
                    ● 24 משתתפים מחוברים בלייב
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-white/80">
                שאלה 2 מתוך 10
              </span>
            </div>

            <p className="mb-6 text-xl md:text-2xl font-bold leading-snug">
              מהו כוכב הלכת הקרוב ביותר לשמש במערכת השמש?
            </p>

            <div className="grid grid-cols-2 gap-3.5">
              {[
                { name: 'נוגה', color: 'bg-fuchsia-500/90 hover:bg-fuchsia-500 text-white border-fuchsia-400/50' },
                { name: 'חמה (מרקורי)', color: 'bg-cyan-500/90 hover:bg-cyan-500 text-slate-950 border-cyan-400/50 font-black' },
                { name: 'מאדים', color: 'bg-amber-400/90 hover:bg-amber-400 text-slate-950 border-amber-300/50' },
                { name: 'צדק', color: 'bg-emerald-500/90 hover:bg-emerald-500 text-slate-950 border-emerald-400/50' },
              ].map((x, i) => (
                <div
                  key={x.name}
                  className={`rounded-2xl p-4 font-bold text-base md:text-lg shadow-lg border backdrop-blur-sm transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-3 ${x.color}`}
                >
                  <span className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center text-xs">
                    {i + 1}
                  </span>
                  <span>{x.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section (New Content Extension) */}
      <section className="mx-auto max-w-7xl px-6 py-24 border-t border-white/10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-bold text-fuchsia-400 uppercase tracking-widest">תהליך פשוט ומהיר</span>
          <h2 className="mt-2 text-3xl font-black md:text-5xl">איך זה עובד בש3 צעדים?</h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.num} className="glass rounded-3xl p-8 relative group hover:border-fuchsia-500/50 transition-all duration-300">
              <span className="text-6xl font-black text-fuchsia-500/20 absolute top-6 left-6 group-hover:text-fuchsia-500/40 transition-colors">
                {s.num}
              </span>
              <h3 className="text-2xl font-bold mt-6 mb-3 relative z-10">{s.title}</h3>
              <p className="text-white/60 leading-relaxed font-light relative z-10">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-bold text-fuchsia-400 uppercase tracking-widest">למה לבחור בנו</span>
          <h2 className="mt-2 text-3xl font-black md:text-5xl">כל מה שצריך כדי להדליק את הקהל</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f) => {
            const IconComponent = f.Icon;
            return (
              <div
                className="glass rounded-3xl p-8 hover:border-fuchsia-400/40 hover:-translate-y-1 transition-all duration-300"
                key={f.t}
              >
                <div className="w-14 h-14 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center mb-6 shadow-inner">
                  <IconComponent />
                </div>
                <h3 className="text-2xl font-bold mb-3">{f.t}</h3>
                <p className="leading-7 text-white/60 font-light">{f.d}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="mx-auto my-24 max-w-5xl rounded-[2.5rem] bg-gradient-to-r from-fuchsia-600 via-purple-600 to-violet-700 p-12 text-center shadow-2xl shadow-fuchsia-600/40 md:p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%)] pointer-events-none" />
        <h2 className="text-4xl font-black md:text-5xl tracking-tight relative z-10">מוכנים להתחיל לשחק?</h2>
        <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto font-light relative z-10">
          הצטרפו למאות מנחים שיוצרים חוויות משחק בלתי נשכחות בקלות ובמהירות.
        </p>
        <div className="mt-8 relative z-10">
          <Button href="/login" kind="secondary" className="text-lg px-10 py-4 shadow-2xl">
            יצירת משחק חדש עכשיו 🚀
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-white/40">
        <p>© {new Date().getFullYear()} MegaClick. כל הזכויות שמורות.</p>
      </footer>
    </main>
  );
}
