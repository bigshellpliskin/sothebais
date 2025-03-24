#!/usr/bin/env node

/**
 * Simple test script to verify @sothebais/packages exports
 * Run with: npm run test:package:simple
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Define the files we want to check
const filesToCheck = [
  './packages/src/utils/logger.js',
  './packages/src/types/service.js',
  './packages/src/schema/index.js'
];

// Check if the Docker-specific paths would be available
const dockerPaths = [
  '/app/packages/src/utils/logger.js',
  '/app/packages/src/types/service.js',
  '/app/packages/src/schema/index.js'
];

// Check the package.json
function checkPackageJson() {
  try {
    console.log('📦 Checking package.json configuration...');
    const packageJsonPath = path.join(projectRoot, 'packages', 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.error(`❌ Package.json not found at ${packageJsonPath}`);
      return false;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (packageJson.type !== 'module') {
      console.error('❌ Package should have type: "module"');
      return false;
    }
    
    if (!packageJson.exports) {
      console.error('❌ Package should have exports field');
      return false;
    }
    
    console.log('✅ package.json configuration is correct');
    return true;
  } catch (error) {
    console.error('❌ Error checking package.json:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Check if files exist
function checkFiles() {
  console.log('\n🔍 Checking if source files exist...');
  let allFilesExist = true;
  
  for (const file of filesToCheck) {
    const filePath = path.join(projectRoot, file);
    try {
      if (fs.existsSync(filePath)) {
        console.log(`✅ Found file: ${file}`);
      } else {
        console.error(`❌ Missing file: ${file}`);
        allFilesExist = false;
      }
    } catch (error) {
      console.error(`❌ Error checking file ${file}:`, error instanceof Error ? error.message : String(error));
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

// Check if Docker paths would be available
function checkDockerPaths() {
  console.log('\n🐳 Checking Docker path configuration...');

  if (!process.env['DOCKER_CONTEXT']) {
    console.log('ℹ️ Not running in Docker context, skipping Docker path checks');
    return true;
  }
  
  let allPathsValid = true;
  
  for (const dockerPath of dockerPaths) {
    try {
      if (fs.existsSync(dockerPath)) {
        console.log(`✅ Docker path available: ${dockerPath}`);
      } else {
        console.error(`❌ Docker path not available: ${dockerPath}`);
        allPathsValid = false;
      }
    } catch (error) {
      console.error(`❌ Error checking Docker path ${dockerPath}:`, error instanceof Error ? error.message : String(error));
      allPathsValid = false;
    }
  }
  
  return allPathsValid;
}

// Run all checks
function runTests() {
  console.log('🧪 Testing @sothebais/packages configuration...\n');
  
  const packageJsonOk = checkPackageJson();
  const filesOk = checkFiles();
  const dockerPathsOk = checkDockerPaths();
  
  console.log('\n📊 Test Results:');
  console.log(`- Package.json configuration: ${packageJsonOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`- Source files exist: ${filesOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`- Docker paths configuration: ${dockerPathsOk ? '✅ PASS' : '❌ FAIL'}`);
  
  const allTestsPassed = packageJsonOk && filesOk && dockerPathsOk;
  
  if (allTestsPassed) {
    console.log('\n🎉 All tests passed! The package is correctly configured.');
    process.exit(0);
  } else {
    console.error('\n❌ Some tests failed. Please fix the issues above.');
    process.exit(1);
  }
}

runTests(); 