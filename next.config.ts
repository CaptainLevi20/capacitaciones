import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: '2mb' } }, // logos de hasta 1 MB más los demás campos
};

export default nextConfig;
