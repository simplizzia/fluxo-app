import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Aumenta o limite de body para Server Actions — necessário para uploads
      // de arquivos via FormData (padrão Next.js é 1 MB).
      bodySizeLimit: '10mb',
      // Domínio customizado precisa ser explicitamente autorizado para que
      // Server Actions não sejam bloqueadas pela proteção CSRF do Next.js.
      allowedOrigins: ['app.simplizzia.com.br'],
    },
  },
};

export default nextConfig;
