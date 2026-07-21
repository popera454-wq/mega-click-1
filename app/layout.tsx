import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MegaClick - שעשועון טריוויה בלייב',
  description: 'משחק טריוויה אינטראקטיבי בזמן אמת',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
