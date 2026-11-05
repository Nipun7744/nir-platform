import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'api-production-2d78.up.railway.app' },
    ],
  },
  async rewrites() {
    // Server-side proxy target. Behind a CDN/reverse proxy the public URL can loop back through it
    // (Cloudflare 403 / Error 1000), so in Docker point this at the api container directly.
    const apiUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    return [{ source: '/uploads/:path*', destination: `${apiUrl}/uploads/:path*` }];
  },
};

export default withNextIntl(nextConfig);
