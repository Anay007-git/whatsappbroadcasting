/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.API_URL
          ? `${process.env.API_URL}/api/:path*`
          : 'http://localhost:4000/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: process.env.API_URL
          ? `${process.env.API_URL}/uploads/:path*`
          : 'http://localhost:4000/uploads/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
