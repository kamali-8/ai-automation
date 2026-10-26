/** @type {import('next').NextConfig} */
const nextConfig = {
  cleanDistDir: false,
  webpack: (config) => {
    config.cache = false;
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist', 'mammoth', 'xlsx', 'bcryptjs', '@prisma/client', 'prisma'],
  },
};

export default nextConfig;

