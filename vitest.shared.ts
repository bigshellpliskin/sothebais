import { defineConfig, mergeConfig } from 'vitest/config';
import rootConfig from './vitest.config';

export function defineWorkspaceConfig(workspaceName: string, options = {}) {
  return mergeConfig(
    rootConfig,
    defineConfig({
      test: {
        name: workspaceName,
        ...options
      }
    })
  );
} 