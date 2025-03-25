import { defineWorkspaceConfig } from '../../vitest.shared';
import { resolve } from 'path';

export default defineWorkspaceConfig('event-handler', {
  environment: 'node',
  include: ['src/**/*.{test,spec}.ts'],
  exclude: ['**/node_modules/**', '**/dist/**'],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
}); 