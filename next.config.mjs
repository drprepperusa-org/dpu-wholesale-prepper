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
  // Allow server-side code to use Node.js native modules
  experimental: {
    serverComponentsExternalPackages: ['pg', 'bcrypt', 'jsonwebtoken', 'nodemailer', 'multer'],
  },
};

export default nextConfig;
