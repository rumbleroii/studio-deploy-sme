/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Optimize images for Vercel
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Optimize imports
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // Disable optimizeCss to avoid critters dependency issues
    optimizeCss: false,
  },
}

module.exports = nextConfig
