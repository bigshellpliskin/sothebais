import { defineWorkspaceConfig } from '../vitest.shared';
import { resolve } from 'path';

export default defineWorkspaceConfig('packages', {
  environment: 'node',
  include: ['src/**/*.{test,spec}.ts'],
  exclude: ['**/node_modules/**', '**/dist/**'],
  resolve: {
    alias: {
      '@sothebais/packages': resolve(__dirname, './src')
    }
  }
}); 