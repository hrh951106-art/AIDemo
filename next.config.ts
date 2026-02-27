import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 输出设置
  output: 'standalone',

  // 图片优化
  images: {
    domains: [],
  },

  // 环境变量（可在构建时访问）
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
  },

  // 服务器外部包（Next.js 16 使用 serverExternalPackages 而非 experimental.serverComponentsExternalPackages）
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],

  // Turbopack 配置（Next.js 16 默认使用 Turbopack）
  turbopack: {},

  // Webpack配置（保留用于兼容性）
  webpack: (config, { isServer }) => {
    // 处理Prisma客户端
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
