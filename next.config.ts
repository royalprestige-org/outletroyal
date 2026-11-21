import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{
      source: '/:path*',
      has: [{ type: 'host' as const, value: 'outletroyal-kappa.vercel.app' }],
      destination: 'https://cocina-los-cabos-bcs.vercel.app/:path*',
      permanent: true,
    }];
  },
};

export default nextConfig;
