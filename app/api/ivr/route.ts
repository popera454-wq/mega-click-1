export async function GET() {
  return new Response(
    "read=t-בדיקת חיבור מוצלחת. המערכת עובדת. הקש ספרה אחת=q_test,no,1,1,10,Digits,no,no,",
    {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    }
  );
}

export async function POST(req: Request) {
  return GET();
}
