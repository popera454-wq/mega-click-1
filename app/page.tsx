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
  className?: string;
}) {
  const baseStyle =
    'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200 active:scale-95 py-3 px-6 text-sm md:text-base';

  const styles = {
    primary:
      'bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white hover:from-fuchsia-400 hover:to-violet-500 shadow-lg shadow-fuchsia-500/25',
    secondary:
      'bg-white text-slate-950 hover:bg-slate-100 shadow-lg shadow-white/10',
    ghost: 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
  };

  return (
    <Link href={href} className={`${baseStyle} ${styles[kind]} ${className}`}>
      {children}
    </Link>
  );
}

// SVG Icons (No external dependencies needed)
const Icons = {
  Sparkles: () => (
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
  ),
  Zap: () => (
    <svg
      className="w-7 h-7 text-fuchsia-300"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  ),
  Users: () => (
    <svg
      className="w-7 h-7 text-fuchsia-300"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  Layers: () => (
    <svg
      className="w-7 h-7 text-fuchsia-300"
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
  ),
  Gamepad: () => (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z"
      />
    </svg>
  ),
  ArrowLeft: () => (
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
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  ),
};

const features = [
  {
    Icon: Icons.Zap,
    t: 'אנרגיה בחדר',
    d: 'חידון חי, טיימרים ואפקטים שמכניסים את כולם לאקשן.',
  },
  {
    Icon: Icons.Users,
    t: 'כולם משתתפים',
    d: 'מהנייד או בטלפון — בלי להוריד אפליקציה ובלי להירשם.',
  },
  {
    Icon: Icons.Layers,
    t: 'בונים בדקות',
    d: 'עורך חכם עם שאלות, תמונות, סקרים ושקופיות תוכן.',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen grid-bg bg-[#0d041e] text-white dir-rtl selection:bg-fuchsia-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#130728bb] px-5 py-4 backdrop-blur-xl md:px-12">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-fuchsia-500 to-violet-500 text-white shadow-md shadow-fuchsia-500/30">
            <Icons.Sparkles />
          </div>
          <span className="text-2xl font-black bg-gradient-to-r from-fuchsia-300 via-pink-200 to-white bg-clip-text text-transparent">
            MegaClick
          </span>
        </div>

        <nav className="flex gap-2">
          <Button href="/play" kind="ghost" className="px-3 md:px-5">
            הצטרפות למשחק
          </Button>
          <Button href="/login" className="px-3 md:px-5">
            יצירת משחק
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="mx-auto grid min-h-[75vh] max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-4 py-2 text-sm text-fuchsia-200 backdrop-blur-md">
            ✦ החידון הבא שלכם מתחיל כאן
          </div>
          <h1 className="text-5xl font-black leading-[1.08] md:text-7xl tracking-tight">
            הופכים כל מפגש
            <br />
            <span className="bg-gradient-to-l from-fuchsia-300 via-pink-400 to-violet-400 bg-clip-text text-transparent">
              למשחק בלתי נשכח.
            </span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-white/70 font-light">
            MegaClick היא פלטפורמת החידונים החיים שתרים את הקהל — בכיתה, באירוע,
            במשרד או בסלון.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button href="/login">
              <span>צרו משחק בחינם</span>
              <Icons.ArrowLeft />
            </Button>
            <Button href="/play" kind="ghost">
              יש לי קוד משחק
            </Button>
          </div>
        </div>

        {/* Live Quiz Card Mockup */}
        <div className="relative">
          <div className="glass neon md:rotate-2 rounded-[2rem] p-6 md:p-10 transition-transform hover:rotate-0 duration-300">
            <div className="mb-8 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/40">
                <Icons.Gamepad />
              </span>
              <div>
                <b className="text-lg block">חידון הידע הגדול</b>
                <p className="text-sm text-white/50">
                  24 משתתפים מחוברים בלייב
                </p>
              </div>
            </div>

            <p className="mb-6 text-2xl font-bold leading-snug">
              מהו כוכב הלכת הקרוב ביותר לשמש?
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'נוגה', color: 'bg-fuchsia-500/90 text-white' },
                { name: 'חמה', color: 'bg-cyan-500/90 text-slate-950' },
                { name: 'מאדים', color: 'bg-amber-400/90 text-slate-950' },
                { name: 'צדק', color: 'bg-emerald-500/90 text-slate-950' },
              ].map((x, i) => (
                <div
                  key={x.name}
                  className={`rounded-xl p-4 font-bold text-lg shadow-md backdrop-blur-sm transition-transform hover:scale-105 cursor-pointer ${x.color}`}
                >
                  {i + 1}. {x.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-center font-bold text-fuchsia-300">
          פשוט. מרגש. עובד לכולם.
        </p>
        <h2 className="mt-3 text-center text-4xl font-black md:text-5xl">
          כל מה שצריך כדי להדליק את הקהל
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {features.map((f) => {
            const IconComponent = f.Icon;
            return (
              <div
                className="glass rounded-3xl p-8 hover:border-fuchsia-400/40 transition-all duration-300"
                key={f.t}
              >
                <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/20 flex items-center justify-center mb-6">
                  <IconComponent />
                </div>
                <h3 className="text-2xl font-bold">{f.t}</h3>
                <p className="mt-3 leading-7 text-white/60 font-light">{f.d}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="mx-auto mb-16 max-w-5xl rounded-[2.5rem] bg-gradient-to-r from-fuchsia-600 via-purple-600 to-violet-700 p-10 text-center shadow-2xl shadow-fuchsia-600/30 md:p-16">
        <h2 className="text-4xl font-black md:text-5xl">מוכנים להתחיל לשחק?</h2>
        <p className="mt-4 text-lg text-white/80">
          המשחק הבא שלכם נמצא במרחק כמה קליקים.
        </p>
        <div className="mt-8">
          <Button href="/login" kind="secondary" className="text-lg px-8 py-4">
            בואו ניצור משחק
          </Button>
        </div>
      </section>
    </main>
  );
}
