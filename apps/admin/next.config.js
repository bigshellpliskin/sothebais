/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  output: 'standalone',
  // Explicitly enable SWC
  swcMinify: true,
  experimental: {
    // Enable all SWC features
    forceSwcTransforms: true,
    // Allow shared package imports
    esmExternals: true,
  },
  // Configure webpack for resolving the shared packages
  webpack: (config, { isServer }) => {
    // Add shared package resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@sothebais/packages': path.resolve(__dirname, '../shared'),
    };
    
    // Add JS extensions to resolve
    config.resolve.extensions = [
      '.js', '.jsx', '.ts', '.tsx', '.json', 
      ...config.resolve.extensions
    ];
    
    return config;
  },
}

module.exports = nextConfig 