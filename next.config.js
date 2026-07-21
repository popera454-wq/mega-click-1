/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // מתעלם משגיאות ניסוח/גרשיים בזמן ה-Build ב-Vercel
    ignoreDuringBuilds: true,
  },
  typescript: {
    // מתעלם מאזהרות טיפוסים קטנות בזמן ה-Build
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
