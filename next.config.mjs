/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Disables X-Powered-By: Next.js to prevent tech stack fingerprinting
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(self), payment=(self)",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/crm', destination: '/leads', permanent: true },
      { source: '/warehouse', destination: '/inventory', permanent: true },
      { source: '/serials', destination: '/serial-numbers', permanent: true },
      { source: '/financials', destination: '/finance', permanent: true },
      { source: '/payments', destination: '/invoices', permanent: true },
      { source: '/handover', destination: '/installations', permanent: true },
      { source: '/enquire', destination: '/enquiry', permanent: true },
    ];
  },
};

export default nextConfig;
