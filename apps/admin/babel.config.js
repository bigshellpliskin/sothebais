module.exports = api => {
  // Only use Babel for test environment
  const isTest = api.env('test');
  
  // Return empty config if not in test environment
  if (!isTest) {
    return {};
  }

  // Use these presets only in test environment
  return {
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }],
      ['@babel/preset-react', { runtime: 'automatic' }],
      '@babel/preset-typescript',
    ],
  };
}; 