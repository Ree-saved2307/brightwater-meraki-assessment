import type { NextConfig } from 'next';
const config: NextConfig = {
  webpack(config) { if (process.env.DISABLE_BUILD_CACHE === 'true') config.cache = false; return config; },
  poweredByHeader: false,
  serverExternalPackages: ['node:sqlite'],
  async headers() { return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'},{key:'Permissions-Policy',value:'camera=(), microphone=(self), geolocation=()'}]}]; }
};
export default config;
