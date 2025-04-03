// Set hostname explicitly for Next.js
process.env.HOSTNAME = '0.0.0.0';
process.env.HOST = '0.0.0.0';

// Start the standalone server
require('./.next/standalone/apps/admin/server.js'); 