#!/usr/bin/env ts-node-esm

/**
 * Test script to verify @sothebais/packages configuration and imports
 * Run with: npm run test:package
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as assert from 'assert';

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function testPackageImports() {
  console.log('🧪 Testing @sothebais/packages configuration...\n');
  
  try {
    // Test 1: Verify package.json configuration
    console.log('📦 Testing package.json configuration...');
    const packageJson = await import(join(projectRoot, 'packages/package.json'), { assert: { type: 'json' } });
    assert.strictEqual(packageJson.default.type, 'module', 'Package should be ESM');
    assert.ok(packageJson.default.exports, 'Package should have exports field');
    console.log('✅ package.json configuration is correct\n');

    // Test 2: Try importing from different package paths
    console.log('🔄 Testing package imports...');
    
    // We'll do dynamic imports to catch any import errors
    const imports = await Promise.allSettled([
      import('@sothebais/packages/utils/logger.js').catch((e: Error) => { throw new Error(`Failed to import logger: ${e.message}`); }),
      import('@sothebais/packages/types/service.js').catch((e: Error) => { throw new Error(`Failed to import service types: ${e.message}`); }),
      import('@sothebais/packages/schema/index.js').catch((e: Error) => { throw new Error(`Failed to import schema: ${e.message}`); })
    ]);

    // Check import results
    imports.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`✅ Import ${index + 1} successful`);
      } else {
        console.error(`❌ Import ${index + 1} failed:`, result.reason);
        throw result.reason;
      }
    });
    console.log('\n');

    // Test 3: Verify Docker path aliases
    console.log('🐳 Testing Docker path aliases...');
    const dockerPaths = [
      '/app/packages/src/utils/logger.js',
      '/app/packages/src/types/service.js',
      '/app/packages/src/schema/index.js'
    ];

    for (const path of dockerPaths) {
      try {
        await import(path);
        console.log(`✅ Docker path ${path} is accessible`);
      } catch (error) {
        if (process.env['DOCKER_CONTEXT']) {
          throw new Error(`Failed to access Docker path ${path}: ${error instanceof Error ? error.message : String(error)}`);
        } else {
          console.log(`ℹ️  Skipping Docker path ${path} (not in Docker context)`);
        }
      }
    }
    console.log('\n');

    console.log('🎉 All package tests passed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Package test failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

testPackageImports().catch(error => {
  console.error('Unhandled error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}); 