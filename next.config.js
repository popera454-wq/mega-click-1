/** @type {import('next').NextPolicy} */
const nextConfig = {
    eslint: {
      // מתעלם בשלב ה-Build משגיאות ESLint
      ignoreDuringBuilds: true,
    },
    typescript: {
      // מתעלם בשלב ה-Build משגיאות TypeScript
      ignoreBuildErrors: true,
    },
  };
  
  module.exports = nextConfig;