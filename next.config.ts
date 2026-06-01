import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Aumenta o limite de body para Server Actions — necessário para uploads
      // de arquivos via FormData (padrão Next.js é 1 MB).
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
