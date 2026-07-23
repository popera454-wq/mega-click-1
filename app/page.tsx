'use client';

import React, { useState } from 'react';
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
  kind?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'green';
  className?: string;
}) {
  const baseStyle =
    'inline-flex items-center justify-center gap-2.5 rounded-2xl font-bold transition-all duration-300 active:scale-95 py-3.5 px-7 text-base shadow-lg';

  const styles = {
    primary:
      'bg-gradient-to-r from-fuchsia-500 via-purple-600 to-violet-600 text-white hover:from-fuchsia-400 hover:to-violet-500 shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50 hover:-translate-y-0.5',
    secondary:
      'bg-white text-slate-950 hover:bg-slate-100 shadow-white/10 hover:shadow-white/20 hover:-translate-y-0.5',
    outline:
      'border-2 border-fuchsia-500/80 text-fuchsia-200 hover:bg-fuchsia-500/20 hover:border-fuchsia-400 hover:text-white backdrop-blur-md hover:-translate-y-0.5',
    ghost:
      'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 backdrop-blur-md',
    green:
      'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 font-black',
  };

  return (
    <Link href={href} className={`${baseStyle} ${styles[kind]} ${className}`}>
      {children}
    </Link>
  );
}

// Icons
const Icons = {
  Sparkles: () => (
    <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Zap: () => (
    <svg className="w-6 h-6 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Phone: () => (
    <svg className="w-6 h-6 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  Users: () => (
    <svg className="w-6 h-6 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Layers: () => (
    <svg className="w-6 h-6 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  Gamepad: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z" />
    </svg>
  ),
  Play: () => (
    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  PlusCircle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-5 h-5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Building: () => (
    <svg className="w-6 h-6 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h5m-5 0V10m0 0h3m-3 0h-3m3 8h3m-3 0h-3" />
    </svg>
  ),
  Star: () => (
    <svg className="w-5 h-5 text-amber-400 fill-amber-400" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
};

// Data Structures
const featureTabs = [
  {
    id: 'creation',
    title: 'ממשק יצירה מרהיב',
    subtitle: 'עריכה מהירה ופשוטה של שאלות, תמונות וסרטונים',
    desc: 'ממשק נוח ואינטואיטיבי ליצירת משחקים בתוך דקות. הוסיפו שאלות אמריקאיות, שאלות טווח, סקרים וסרטונים בלי שום ידע טכני מוקדם.',
    points: ['מחולל שאלות מהיר', 'תמיכה במדיה עשירה (תמונות, אודיו, וידאו)', 'תצוגה מקדימה בלייב', 'שמירה ועריכה חוזרת'],
    badge: 'חוויה מותאמת',
  },
  {
    id: 'live',
    title: 'הפעלת המשחק בלייב',
    subtitle: 'שליטה מלאה של המנחה בזמן אמת',
    desc: 'לוח בקרה מתקדם המאפשר למנחה לשלוט בקצב, להציג טבלת מובילים, להשהות שאלות ולייצר מתח שישיג 100% מעורבות באולם.',
    points: ['טבלת מובילים דינמית', 'אפקטים קוליים וחזותיים בלייב', 'טיימרים מותאמים אישית', 'שליטה מהטלפון או הלפטופ'],
    badge: 'שליטה בלייב',
  },
  {
    id: 'phone',
    title: 'מענה קולי בטלפון (IVR)',
    subtitle: 'חיבור ישיר למענה קולי ללא צורך בסמארטפון',
    desc: 'הפתרון המנצח לקהילות, מוסדות חינוך והציבור החרדי/דתי. המשתתפים מחייגים למספר טלפון, מקישים קוד ומשחקים דרך המקשים.',
    points: ['תמיכה במאות מחייגים בו-זמנית', 'אינטגרציה מלאה עם ימות המשיח', 'ללא צורך באינטרנט או מסכים', 'חישוב מהירות מענה טלפונית'],
    badge: 'טלפוניה מתקדמת',
  },
  {
    id: 'customization',
    title: 'מיתוג ועיצוב אישי',
    subtitle: 'התאמה מלאה לשפת המותג שלכם',
    desc: 'הוסיפו לוגו, צבעי מותג, רקעים מותאמים אישית והודעות סיום. המשחק נראה לחלוטין כמו פיתוח ייעודי של הארגון שלכם.',
    points: ['העלאת לוגו ורקע מותאם', 'ערכות נושא (Themes) מרהיבות', 'הודעות תוצאה מותאמות', 'כתובת קישור ממותגת'],
    badge: '100% מותאם',
  },
  {
    id: 'analytics',
    title: 'דוחות ותוצאות',
    subtitle: 'ניתוח נתונים מעמיק בסיום האירוע',
    desc: 'המערכת מייצרת דוח מפורט הכולל אחוזי הצלחה, שאלות מכשילות, זמן מענה ממוצע וייצוא קל לקובצי Excel.',
    points: ['ייצוא נתונים מלא ל-Excel', 'פלחי שוק ופילוח תשובות', 'דירוג משתתפים מלא', 'שמירת היסטוריית משחקים'],
    badge: 'אנליטיקה מלאה',
  },
];

const workSteps = [
  { num: '01', title: 'מתאימים סגנון', desc: 'בוחרים אם המשחק יתקיים דרך מסך מוקרן, סמארטפונים, או בטלפון קולי (IVR).' },
  { num: '02', title: 'יוצרים משחק', desc: 'בונים שאלון חדש או בוחרים מתוך מאגר תכניות מוכנות ומעצבים את החוויה.' },
  { num: '03', title: 'מקבלים PIN / מספר', desc: 'המערכת מייצרת קוד PIN ייחודי למשחק או מנפיקה שלוחה טלפונית יעודית.' },
  { num: '04', title: 'הקהל מתחבר', desc: 'המשתתפים סורקים קוד QR, נכנסים מהאתר או מחייגים מהטלפון בשניות.' },
  { num: '05', title: 'מפעילים בלייב', desc: 'המנחה מריץ את המשחק, מעביר שאלות ומציג ניקוד וטבלת מובילים בזמן אמת.' },
  { num: '06', title: 'מכריזים ומנתחים', desc: 'חוגגים עם המנצחים ומורידים דוח תוצאות מפורט לניהול ומעקב.' },
];

const readyPrograms = [
  {
    title: 'סינק - מסע אל תוך עצמך',
    tag: 'משחק חווייתי מעצים',
    desc: 'משחק קליקרים וטלפונים מרתק לכל המשפחה והקהילה. מסע עמוק, משעשע ומפתיע שובש את כולם.',
    features: ['הפעלה עצמית קלה', 'מתאים לכל הגילאים', 'כולל קטעי וידאו ואודיו'],
    badge: 'פופולרי במיוחד',
    color: 'from-fuchsia-600/30 to-purple-600/30',
  },
  {
    title: 'השילוב המנצח - בת מצווה',
    tag: 'אירועים ומשפחות',
    desc: 'חוויה ויזואלית מרהיבה + משחק קליקרים/טלפונים שכובש את כל האורחים. להבין את המשמעות בצורה אינטראקטיבית.',
    features: ['שיר מיוחד בהפקה אישית', 'התאמה אישית של שמות ותמונות', 'תחרות נושאת פרסים'],
    badge: 'מיוחד לאירועים',
    color: 'from-pink-600/30 to-rose-600/30',
  },
  {
    title: 'חידוני חגים ומועדים',
    tag: 'בתי ספר וקהילות',
    desc: 'ערכות חידונים מוכנות לראש השנה, חנוכה, פסח, ימי שיא ואירועי גיבוש בית-ספריים.',
    features: ['מוכן להפעלה מיידית', 'שאלות ברמות קושי משתנות', 'כולל חומרי הדרכה למנחה'],
    badge: 'ערכה מוכנה',
    color: 'from-violet-600/30 to-indigo-600/30',
  },
];

const faqList = [
  {
    q: 'מה זה MegaClick ואיך היא עובדת?',
    a: 'MegaClick היא פלטפורמה טכנולוגית מתקדמת להפעלת חידונים, סקרים ומשחקים אינטראקטיביים בזמן אמת. המשתתפים יכולים להשיב דרך הדפדפן בסמארטפון (עם קוד PIN) או דרך שיחת טלפון קולית (IVR).',
  },
  {
    q: 'האם המערכת מתאימה גם לציבור החרדי/דתי ללא סמארטפונים?',
    a: 'בהחלט! MegaClick מציעה תמיכה מלאה ומובנית במערכת מענה קולי טלפוני (אינטגרציה עם ימות המשיח). המשתתפים מחייגים למספר טלפון רגיל או כשר ומשיבים באמצעות מקשי הטלפון.',
  },
  {
    q: 'כמה משתתפים יכולים לשחק בו-זמנית?',
    a: 'המערכת תומכת החל מקבוצות קטנות של 10 משתתפים ועד לאירועי ענק של אלפי משתתפים בו-זמנית ללא השהיה (Zero Latency).',
  },
  {
    q: 'האם צריך להתקין אפליקציה כלשהי?',
    a: 'בשום אופן לא! המשתתפים נכנסים דרך הדפדפן באתר או מחייגים בטלפון. אין צורך בהורדות, הרשמות או התקנות מסובכות.',
  },
  {
    q: 'האם אפשר להשתמש בתכניות מוכנות מראש?',
    a: 'כן! מלבד האפשרות ליצור משחק מאפס, אנו מציעים קטלוג עשיר של תכניות מוכנות מראש לחגים, אירועים משפחתיים, בתי ספר וערבי גיבוש.',
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('creation');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const selectedTabData = featureTabs.find((t) => t.id === activeTab) || featureTabs[0];

  return (
    <main className="min-h-screen grid-bg bg-[#0d041e] text-white dir-rtl selection:bg-fuchsia-500 selection:text-white overflow-x-hidden">
      
      {/* ─── Top Header / Navigation ─── */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#0d041e]/90 px-6 py-4 backdrop-blur-2xl md:px-12">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-tr from-fuchsia-500 via-purple-600 to-violet-500 text-white shadow-lg shadow-fuchsia-500/30 group-hover:scale-105 transition-transform">
              <Icons.Sparkles />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black bg-gradient-to-r from-fuchsia-300 via-pink-200 to-white bg-clip-text text-transparent tracking-tight leading-none">
                MegaClick
              </span>
              <span className="text-[10px] text-fuchsia-400 font-semibold tracking-wider">
                חוויית משחק בלייב
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-white/80">
            <a href="#how-it-works" className="hover:text-fuchsia-300 transition-colors">איך זה עובד?</a>
            <a href="#features" className="hover:text-fuchsia-300 transition-colors">יתרונות המערכת</a>
            <a href="#programs" className="hover:text-fuchsia-300 transition-colors">תכניות מוכנות</a>
            <a href="#institutions" className="hover:text-fuchsia-300 transition-colors">למוסדות וארגונים</a>
            <a href="#faq" className="hover:text-fuchsia-300 transition-colors">שאלות נפוצות</a>
          </nav>
        </div>

        {/* Header Action Buttons - Two Key Actions */}
        <div className="flex items-center gap-3">
          <Button href="/play" kind="outline" className="px-4 py-2.5 text-sm">
            <Icons.Play />
            <span>הצטרפות למשחק</span>
          </Button>
          <Button href="/login" kind="primary" className="px-5 py-2.5 text-sm">
            <Icons.PlusCircle />
            <span>יצירת משחק</span>
          </Button>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative mx-auto grid min-h-[85vh] max-w-7xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:px-12">
        <div className="space-y-6 text-right">
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-2 text-sm text-fuchsia-200 backdrop-blur-md shadow-inner">
            <span className="animate-pulse text-fuchsia-400">✦</span> הפלטפורמה המובילה למשחקי טריוויה ושלט-רחוק
          </div>

          <h1 className="text-4xl font-black leading-[1.1] sm:text-5xl md:text-6xl lg:text-7xl tracking-tight">
            חוויית משחק מגבשת
            <br />
            <span className="bg-gradient-to-l from-fuchsia-300 via-pink-400 to-violet-400 bg-clip-text text-transparent">
              בלייב ובטלפון.
            </span>
          </h1>

          <p className="max-w-xl text-lg md:text-xl leading-relaxed text-white/70 font-light">
            MegaClick מחברת את כולם! מערכת טריוויה אינטראקטיבית בזמן אמת דרך הדפדפן או בחיוג טלפוני קולי (IVR) — מותאמת במיוחד לבתי ספר, אירועים, קהילות וארגונים.
          </p>

          {/* TWO MAIN CENTRAL BUTTONS */}
          <div className="flex flex-wrap gap-4 pt-4">
            <Button href="/play" kind="green" className="text-lg px-8 py-4 shadow-emerald-500/20">
              <Icons.Play />
              <span>להצטרפות למשחק מהאתר</span>
            </Button>
            <Button href="/login" kind="primary" className="text-lg px-8 py-4">
              <Icons.PlusCircle />
              <span>יצירת משחקים להתחברות</span>
            </Button>
          </div>

          {/* Quick stats micro-bar */}
          <div className="pt-6 flex items-center gap-6 border-t border-white/10 text-xs text-white/60">
            <div className="flex items-center gap-1.5">
              <Icons.Check />
              <span>ללא הורדת אפליקציה</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Icons.Check />
              <span>תמיכה מלאה ב-IVR קולי</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Icons.Check />
              <span>100% מענה בזמן אמת</span>
            </div>
          </div>
        </div>

        {/* Live Interactive Game Mockup */}
        <div className="relative animate-float">
          <div className="absolute -inset-2 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-violet-600 rounded-[2.5rem] blur-2xl opacity-40 -z-10" />
          <div className="glass neon-glow rounded-[2.5rem] p-6 md:p-8 transition-all duration-300 border border-white/15">
            
            {/* Header of Mockup */}
            <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/40">
                  <Icons.Gamepad />
                </span>
                <div>
                  <b className="text-lg block font-bold">שעשועון טריוויה בלייב</b>
                  <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    142 משתתפים מחוברים (אתר + טלפון)
                  </p>
                </div>
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/30 text-xs font-bold text-fuchsia-200">
                שאלה 4 מתוך 12
              </span>
            </div>

            {/* Question Box */}
            <div className="mb-6 space-y-2">
              <span className="text-xs font-bold text-fuchsia-300 uppercase tracking-wider">שאלה בזמן אמת:</span>
              <p className="text-xl md:text-2xl font-black leading-snug">
                כמה סיבובים מבצע כדור הארץ סביב ציר של עצמו ביממה אחת?
              </p>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-2 gap-3.5">
              {[
                { label: 'סיבוב אחד (1)', color: 'bg-emerald-500/90 text-slate-950 font-black border-emerald-300', correct: true },
                { label: '12 סיבובים', color: 'bg-white/10 text-white border-white/10', correct: false },
                { label: '365 סיבובים', color: 'bg-white/10 text-white border-white/10', correct: false },
                { label: '7 סיבובים', color: 'bg-white/10 text-white border-white/10', correct: false },
              ].map((opt, i) => (
                <div
                  key={opt.label}
                  className={`rounded-2xl p-4 font-bold text-sm md:text-base border transition-all flex items-center justify-between ${opt.color}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-black/20 flex items-center justify-center text-xs font-black">
                      {i + 1}
                    </span>
                    <span>{opt.label}</span>
                  </div>
                  {opt.correct && <Icons.Check />}
                </div>
              ))}
            </div>

            {/* Live Progress Bar */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
              <span>זמן נותר: 00:14</span>
              <div className="w-1/2 bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-fuchsia-500 to-emerald-400 h-full w-3/4 rounded-full" />
              </div>
              <span>78% השיבו</span>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Stats & Proof Banner ─── */}
      <section className="border-y border-white/10 bg-white/[0.02] py-10 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 md:px-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl md:text-5xl font-black bg-gradient-to-r from-fuchsia-400 to-pink-300 bg-clip-text text-transparent">
              ללא הגבלה
            </div>
            <div className="text-sm text-white/60 font-light mt-1">משתתפים בו-זמנית</div>
          </div>
          <div>
            <div className="text-3xl md:text-5xl font-black bg-gradient-to-r from-fuchsia-400 to-purple-300 bg-clip-text text-transparent">
              אלפי
            </div>
            <div className="text-sm text-white/60 font-light mt-1">אירועים וחידונים שהופעלו</div>
          </div>
          <div>
            <div className="text-3xl md:text-5xl font-black bg-gradient-to-r from-fuchsia-400 to-violet-300 bg-clip-text text-transparent">
              מאות
            </div>
            <div className="text-sm text-white/60 font-light mt-1">בתי ספר, מוסדות וקהילות</div>
          </div>
          <div>
            <div className="text-3xl md:text-5xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              100%
            </div>
            <div className="text-sm text-white/60 font-light mt-1">זמן אמת ללא השהיה</div>
          </div>
        </div>
      </section>

      {/* ─── Interactive Feature Showcase ("יתרונות המערכת") ─── */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24 md:px-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest bg-fuchsia-500/10 px-4 py-1.5 rounded-full border border-fuchsia-500/20">
            היתרונות שעושים את ההבדל
          </span>
          <h2 className="mt-4 text-3xl font-black md:text-5xl">
            המערכת שנותנת לכם שליטה מוחלטת
          </h2>
          <p className="mt-3 text-white/60 text-lg">
            גלו את האופציות הרבות שיהפכו את האירוע שלכם לחוות שיא בלתי נשכחת
          </p>
        </div>

        {/* Interactive Tabs Layout */}
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          
          {/* Sidebar Tab Selectors */}
          <div className="lg:col-span-5 space-y-3">
            {featureTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-right p-5 rounded-2xl transition-all duration-300 flex items-center justify-between border ${
                    isActive
                      ? 'bg-gradient-to-r from-fuchsia-600/30 via-purple-600/20 to-transparent border-fuchsia-500/60 shadow-lg shadow-fuchsia-500/10 translate-x-1'
                      : 'glass hover:bg-white/5 border-white/5 text-white/70'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold text-lg text-white flex items-center gap-2">
                      <span>{tab.title}</span>
                    </div>
                    <p className="text-xs text-white/50">{tab.subtitle}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${isActive ? 'bg-fuchsia-500 text-white' : 'bg-white/10 text-white/60'}`}>
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Display Card */}
          <div className="lg:col-span-7 glass-card rounded-3xl p-8 md:p-10 border border-fuchsia-500/30 relative overflow-hidden min-h-[420px] flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-violet-500" />
            
            <div className="space-y-6">
              <div className="inline-block px-3 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-300 text-xs font-bold border border-fuchsia-500/30">
                {selectedTabData.badge}
              </div>

              <h3 className="text-3xl font-black">{selectedTabData.title}</h3>
              <p className="text-white/80 leading-relaxed text-lg font-light">
                {selectedTabData.desc}
              </p>

              <div className="grid sm:grid-cols-2 gap-3 pt-4">
                {selectedTabData.points.map((pt) => (
                  <div key={pt} className="flex items-center gap-2.5 bg-white/5 p-3 rounded-xl border border-white/5">
                    <Icons.Check />
                    <span className="text-sm font-medium">{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-white/50">מוכן להפעלה מיידית במערכת</span>
              <Button href="/login" kind="primary" className="text-sm px-6 py-2.5">
                נסה רכיב זה עכשיו
              </Button>
            </div>
          </div>

        </div>
      </section>

      {/* ─── "איך זה עובד?" - 6 שלבי העבודה ─── */}
      <section id="how-it-works" className="border-t border-white/10 bg-white/[0.01] py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest bg-fuchsia-500/10 px-4 py-1.5 rounded-full border border-fuchsia-500/20">
              תהליך קל ומהיר
            </span>
            <h2 className="mt-4 text-3xl font-black md:text-5xl">
              שלבי העבודה ב-6 צעדים פשוטים
            </h2>
            <p className="mt-3 text-white/60 text-lg">
              מהרגע שנכנסים למערכת ועד להכרזה על המנצחים באירוע
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {workSteps.map((step) => (
              <div
                key={step.num}
                className="glass rounded-3xl p-8 relative group hover:border-fuchsia-500/50 hover:-translate-y-1 transition-all duration-300"
              >
                <span className="text-5xl font-black text-fuchsia-500/20 absolute top-6 left-6 group-hover:text-fuchsia-500/40 transition-colors">
                  #{step.num}
                </span>
                <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center mb-4 text-fuchsia-300 font-black text-sm">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold mb-2 relative z-10">{step.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed font-light relative z-10">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── "תכניות מוכנות" Catalog ─── */}
      <section id="programs" className="mx-auto max-w-7xl px-6 py-24 md:px-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest bg-fuchsia-500/10 px-4 py-1.5 rounded-full border border-fuchsia-500/20">
            ערכות משחק מוכנות
          </span>
          <h2 className="mt-4 text-3xl font-black md:text-5xl">
            בואו לבחור מה הכי מתאים עבורכם
          </h2>
          <p className="mt-3 text-white/60 text-lg">
            אין לכם זמן ליצור משחק מאפס? בחרו תכנית מוכנה והפעילו בלחיצת כפתור!
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {readyPrograms.map((prog) => (
            <div
              key={prog.title}
              className={`glass rounded-3xl p-8 border border-white/10 hover:border-fuchsia-400/50 transition-all duration-300 flex flex-col justify-between bg-gradient-to-b ${prog.color}`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-fuchsia-200">
                    {prog.tag}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-fuchsia-500/30 text-fuchsia-200 border border-fuchsia-400/30">
                    {prog.badge}
                  </span>
                </div>

                <h3 className="text-2xl font-black">{prog.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed font-light">
                  {prog.desc}
                </p>

                <div className="space-y-2 pt-2 border-t border-white/10">
                  {prog.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-white/80">
                      <Icons.Check />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-white/10">
                <Button href="/login" kind="ghost" className="w-full text-sm py-3 justify-center">
                  לפרטים והפעלת התכנית
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── "מתאימים במיוחד למוסדות" Section ─── */}
      <section id="institutions" className="border-y border-white/10 bg-gradient-to-b from-purple-950/40 to-slate-950/60 py-20">
        <div className="mx-auto max-w-7xl px-6 md:px-12 grid lg:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6">
            <span className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest bg-fuchsia-500/10 px-4 py-1.5 rounded-full border border-fuchsia-500/20">
              פתרונות למוסדות חינוך וקהילות
            </span>

            <h2 className="text-3xl md:text-5xl font-black leading-tight">
              מותאם במיוחד לבתי ספר, מתנ״סים וקהילות
            </h2>

            <p className="text-white/70 text-lg leading-relaxed font-light">
              המערכת מספקת מענה שלם לכל סוגי האוכלוסיות והמגזרים: הפרדה בין כיתות ושלוחות, תמיכה מלאה במכשירים מוגנים, ומענה טלפוני (IVR) רציף באיכות גבוהה.
            </p>

            <div className="space-y-3 pt-2">
              {[
                'חטיבות ניהול עצמאיות לבתי ספר ולרשתות',
                'תמיכה מלאה בטלפונים כשרים וללא אינטרנט',
                'נגישות מלאה ועמידה בתקני אבטחה מחמירים',
                'צוות תמיכה טכני זמין לכל אירוע',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                  <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Icons.Check />
                  </div>
                  <span className="font-semibold text-sm md:text-base">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-3xl p-8 border border-white/10 space-y-6">
            <h3 className="text-xl font-bold border-b border-white/10 pb-4 flex items-center gap-2">
              <Icons.Building />
              <span>יכולות מפתח למוסדות</span>
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                <b className="text-fuchsia-300 block text-sm">שלוחות IVR מרובות</b>
                <p className="text-xs text-white/60">חלוקת תלמידים/משתתפים לפי כיתות וקבוצות שונות.</p>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                <b className="text-fuchsia-300 block text-sm">ניקוד מצטבר מוסדי</b>
                <p className="text-xs text-white/60">טבלאות מובילים שבועיות וחודשיות לכלל הבית ספר.</p>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                <b className="text-fuchsia-300 block text-sm">דוחות מנהל מפורטים</b>
                <p className="text-xs text-white/60">קבלת נתוני השתתפות ואחוזי הצלחה בלחיצת כפתור.</p>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                <b className="text-fuchsia-300 block text-sm">התאמת תוכן פדגוגי</b>
                <p className="text-xs text-white/60">בנק שאלות מותאם לתכניות הלימודים והערכים.</p>
              </div>
            </div>

            <div className="pt-2">
              <Button href="/login" kind="outline" className="w-full justify-center">
                תאמו הדגמה למוסד שלכם
              </Button>
            </div>
          </div>

        </div>
      </section>

      {/* ─── Interactive FAQ Accordion ─── */}
      <section id="faq" className="mx-auto max-w-4xl px-6 py-24">
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest bg-fuchsia-500/10 px-4 py-1.5 rounded-full border border-fuchsia-500/20">
            תשובות לכל השאלות
          </span>
          <h2 className="mt-4 text-3xl font-black md:text-5xl">
            שאלות נפוצות על המערכת
          </h2>
        </div>

        <div className="space-y-4">
          {faqList.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.q}
                className="glass rounded-2xl border border-white/10 overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-6 text-right font-bold text-lg flex items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className={`transform transition-transform ${isOpen ? 'rotate-180 text-fuchsia-400' : 'text-white/40'}`}>
                    <Icons.ChevronDown />
                  </span>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 text-white/70 leading-relaxed text-base font-light border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Contact & Lead Form Section ("דברו איתנו!") ─── */}
      <section id="contact" className="mx-auto my-16 max-w-5xl px-6">
        <div className="glass-card rounded-[2.5rem] p-8 md:p-14 border border-fuchsia-500/30 relative overflow-hidden bg-gradient-to-br from-fuchsia-950/40 via-purple-950/30 to-slate-950">
          
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
            <h2 className="text-3xl md:text-5xl font-black">דברו איתנו!</h2>
            <p className="text-white/70 text-base font-light">
              מלאו את הפרטים ונחזור אליכם בהקדם, או צרו איתנו קשר ישיר:
            </p>
            
            {/* Quick Contact Chips */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-sm font-bold">
              <a href="tel:037737970" className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-fuchsia-200 flex items-center gap-2 border border-white/10">
                <Icons.Phone />
                <span>03-7737970</span>
              </a>
              <a href="mailto:support@megaclick.co.il" className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-fuchsia-200 flex items-center gap-2 border border-white/10">
                <span>support@megaclick.co.il</span>
              </a>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4 max-w-2xl mx-auto">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5">שם מלא *</label>
                <input
                  type="text"
                  placeholder="ישראל ישראלי"
                  className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-white placeholder-white/30 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5">טלפון *</label>
                <input
                  type="tel"
                  placeholder="050-0000000"
                  className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-white placeholder-white/30 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5">אימייל</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-white placeholder-white/30 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 mb-1.5">תוכן ההודעה / פרטי האירוע</label>
              <textarea
                rows={3}
                placeholder="ספרו לנו על האירוע שלכם (תאריך, כמות משתתפים, סוג הקהל...)"
                className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-white placeholder-white/30 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-white/60 pt-1">
              <input type="checkbox" id="terms" className="rounded bg-white/10 border-white/20 text-fuchsia-500 focus:ring-0" />
              <label htmlFor="terms">קראתי ואשרתי את מדיניות הפרטיות ותקנון האתר</label>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 py-4 font-black text-lg text-white shadow-xl shadow-fuchsia-500/30 hover:from-fuchsia-400 hover:to-violet-500 transition-all hover:scale-[1.01]"
            >
              שליחת הודעה לצוות המערכת 🚀
            </button>
          </form>

        </div>
      </section>

      {/* ─── Bottom CTA Banner ─── */}
      <section className="mx-auto my-16 max-w-5xl rounded-[2.5rem] bg-gradient-to-r from-fuchsia-600 via-purple-600 to-violet-700 p-10 text-center shadow-2xl shadow-fuchsia-600/30 md:p-14 relative overflow-hidden">
        <h2 className="text-3xl font-black md:text-5xl tracking-tight relative z-10">
          מוכנים להתחיל לשחק?
        </h2>
        <p className="mt-3 text-base md:text-lg text-white/80 max-w-xl mx-auto font-light relative z-10">
          הצטרפו למאות מנחים, מורים ומארגנים שיוצרים חוויות משחק בלתי נשכחות.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4 relative z-10">
          <Button href="/play" kind="secondary" className="text-lg px-8 py-4">
            <Icons.Play />
            <span>להצטרפות למשחק מהאתר</span>
          </Button>
          <Button href="/login" kind="ghost" className="text-lg px-8 py-4 bg-white/10 hover:bg-white/20 border-white/20">
            <Icons.PlusCircle />
            <span>ליצירת משחק חדש</span>
          </Button>
        </div>
      </section>

      {/* ─── Rich Footer ─── */}
      <footer className="border-t border-white/10 bg-[#080214] py-16 text-sm text-white/60">
        <div className="mx-auto max-w-7xl px-6 md:px-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Col 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-fuchsia-500 text-white">
                <Icons.Sparkles />
              </div>
              <span className="text-xl font-black text-white">MegaClick</span>
            </div>
            <p className="text-xs leading-relaxed text-white/50 font-light">
              פלטפורמת המשחקים, החידונים והשלט-רחוק הטלפוני המתקדמת בישראל. מעצימים אירועים, כיתות וקהילות בזמן אמת.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-3">
            <b className="text-white block text-sm font-bold">ניווט מהיר</b>
            <ul className="space-y-2 text-xs">
              <li><a href="#how-it-works" className="hover:text-fuchsia-300 transition-colors">איך זה עובד</a></li>
              <li><a href="#features" className="hover:text-fuchsia-300 transition-colors">יתרונות המערכת</a></li>
              <li><a href="#programs" className="hover:text-fuchsia-300 transition-colors">תכניות מוכנות</a></li>
              <li><a href="#institutions" className="hover:text-fuchsia-300 transition-colors">פתרונות למוסדות</a></li>
              <li><a href="#faq" className="hover:text-fuchsia-300 transition-colors">שאלות נפוצות</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-3">
            <b className="text-white block text-sm font-bold">תכניות ומסלולים</b>
            <ul className="space-y-2 text-xs">
              <li><Link href="/play" className="hover:text-fuchsia-300 transition-colors">כניסת שחקן (קוד PIN)</Link></li>
              <li><Link href="/login" className="hover:text-fuchsia-300 transition-colors">אזור מנחה / יצירת משחק</Link></li>
              <li><a href="#programs" className="hover:text-fuchsia-300 transition-colors">תכנית "סינק"</a></li>
              <li><a href="#programs" className="hover:text-fuchsia-300 transition-colors">תכניות בת מצווה ואירועים</a></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-3">
            <b className="text-white block text-sm font-bold">צור קשר</b>
            <p className="text-xs text-white/50">טלפון: 03-7737970</p>
            <p className="text-xs text-white/50">אימייל: support@megaclick.co.il</p>
            <p className="text-xs text-white/50">מצדה 7 קומה 29, בני ברק, ישראל</p>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-white/5 text-center text-xs text-white/40">
          <p>© {new Date().getFullYear()} MegaClick. כל הזכויות שמורות. תנאי שימוש ומדיניות פרטיות.</p>
        </div>
      </footer>

    </main>
  );
}
