/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: '../docs',           // ← خروجی در ../docs
  images: { unoptimized: true },
  trailingSlash: true,
  // اگر ریپو با زیرپوشه است (مثلاً username.github.io/ArzPulse)
  basePath: process.env.NODE_ENV === 'production' ? '/ArzPulse' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/ArzPulse' : '',
};

module.exports = nextConfig;
