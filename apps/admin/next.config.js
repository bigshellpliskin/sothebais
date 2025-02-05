/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Explicitly enable SWC
  swcMinify: true,
  experimental: {
    // Enable all SWC features
    forceSwcTransforms: true,
  },
}

module.exports = nextConfig 