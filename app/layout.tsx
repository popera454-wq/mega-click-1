import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MegaClick - שעשועון טריוויה בלייב',
  description: 'משחק טריוויה אינטראקטיבי בזמן אמת לכיתות, אירועים ומפגשים',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-[#0d041e] text-slate-100 selection:bg-fuchsia-500 selection:text-white relative">
        {/* Ambient background glowing blobs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />
        {children}
      </body>
    </html>
  );
}
