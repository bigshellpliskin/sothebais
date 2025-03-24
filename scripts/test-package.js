#!/usr/bin/env node

/**
 * Basic test script to verify the @sothebais/packages exports in plain JavaScript
 * Run with: npm run test:package:js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Check package.json configuration
console.log('🧪 Testing @sothebais/packages configuration...');

try {
  // Test package.json
  console.log('\n📦 Checking package.json...');
  const packageJsonPath = path.join(projectRoot, 'packages', 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error(`❌ package.json not found at ${packageJsonPath}`);
    process.exit(1);
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (packageJson.type !== 'module') {
    console.error('❌ Package should have type: "module"');
  } else {
    console.log('✅ Package has type: "module"');
  }
  
  if (!packageJson.exports) {
    console.error('❌ Package should have exports field');
  } else {
    console.log('✅ Package has exports field');
    
    console.log('\n🔍 Checking exports configuration:');
    
    // Check each export
    Object.entries(packageJson.exports).forEach(([key, value]) => {
      console.log(`- ${key}: ${value}`);
    });
  }
  
  // Check if the files exist
  console.log('\n📂 Checking if source files exist:');
  
  const filesToCheck = [
    ['utils/logger.js', 'packages/src/utils/logger.ts'],
    ['types/service.js', 'packages/src/types/service.ts'],
    ['schema/index.js', 'packages/src/schema/index.ts']
  ];
  
  filesToCheck.forEach(([exportPath, sourcePath]) => {
    const fullPath = path.join(projectRoot, sourcePath);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ Source file exists: ${sourcePath}`);
    } else {
      console.error(`❌ Missing source file: ${sourcePath}`);
    }
  });
  
  // Check Docker path configuration
  console.log('\n🐳 Docker path configuration:');
  if (process.env.DOCKER_CONTEXT === 'true') {
    console.log('Running in Docker context, checking Docker paths');
    
    const dockerPaths = [
      '/app/packages/src/utils/logger.ts',
      '/app/packages/src/types/service.ts',
      '/app/packages/src/schema/index.ts'
    ];
    
    dockerPaths.forEach(dockerPath => {
      if (fs.existsSync(dockerPath)) {
        console.log(`✅ Docker path accessible: ${dockerPath}`);
      } else {
        console.error(`❌ Docker path not accessible: ${dockerPath}`);
      }
    });
  } else {
    console.log('Not running in Docker context, skipping Docker path checks');
  }
  
  console.log('\n✅ Test completed!');
} catch (error) {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
} 