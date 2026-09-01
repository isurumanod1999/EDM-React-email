/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: [
      '@react-email/components',
      '@react-email/render',
      'sharp',
    ],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  async rewrites() {
    if (!process.env.VERCEL) return [];
    return [
      {
        source: '/images/uploads/:filename',
        destination: '/api/assets/file/:filename',
      },
    ];
  },
};

module.exports = nextConfig;
