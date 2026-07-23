import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MegaClick - פלטפורמת המשחקים והטריוויה בלייב ובטלפון',
  description: 'מערכת טריוויה, קליקרים וסקרים בלייב ובמענה טלפוני למוסדות, אירועים וקהילות.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className="scroll-smooth">
      <body className="min-h-screen bg-[#0d041e] text-slate-100 selection:bg-fuchsia-500 selection:text-white relative">
        {/* Ambient background glowing blobs */}
        <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
        <div className="fixed top-1/3 right-1/4 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
        <div className="fixed bottom-10 left-1/3 w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
        {children}
      </body>
    </html>
  );
}
