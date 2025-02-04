/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          // Base options
          esModuleInterop: true,
          skipLibCheck: true,
          target: "ES2022",
          allowJs: true,
          resolveJsonModule: true,
          moduleDetection: "force",
          isolatedModules: true,
          verbatimModuleSyntax: false,  // Disabled for test compatibility
          
          // Module settings
          module: "NodeNext",
          moduleResolution: "NodeNext",
          
          // Test specific settings
          noEmit: true,
          
          // Paths
          paths: {
            "@/*": ["./src/*"]
          }
        }
      }
    ]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^../pipeline/sharp-renderer.js$': '<rootDir>/src/workers/__mocks__/sharp-renderer.ts'
  },
  testMatch: [
    '**/src/**/__tests__/**/*.+(ts|tsx|js)',
    '**/src/**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleDirectories: ['node_modules', 'src'],
  transformIgnorePatterns: [],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testTimeout: 10000  // Increase timeout for async operations
}; 