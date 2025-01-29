const { execSync } = require('child_process');
const fs = require('fs');

const requiredCommands = [
  'ffmpeg',
  'python3',
  'pkg-config'
];

const requiredLibraries = [
  'libcairo2',
  'libpango-1.0',
  'libjpeg',
  'libgif'
];

function checkCommand(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    console.log(`✅ ${command} is available`);
    return true;
  } catch (error) {
    console.error(`❌ ${command} is not installed`);
    return false;
  }
}

function checkLibrary(library) {
  try {
    execSync(`pkg-config --exists ${library}`, { stdio: 'ignore' });
    console.log(`✅ ${library} is available`);
    return true;
  } catch (error) {
    console.error(`❌ ${library} is not installed`);
    return false;
  }
}

console.log('Checking system dependencies...');

const commandsOk = requiredCommands.every(checkCommand);
const librariesOk = requiredLibraries.every(checkLibrary);

if (!commandsOk || !librariesOk) {
  console.error(`
Missing dependencies detected. Please install them:

For Alpine Linux:
  apk add --no-cache \\
    python3 \\
    make \\
    g++ \\
    jpeg-dev \\
    cairo-dev \\
    giflib-dev \\
    pango-dev \\
    ffmpeg \\
    pixman-dev \\
    pkgconfig \\
    libc6-compat

For Ubuntu/Debian:
  apt-get update && apt-get install -y \\
    python3 \\
    build-essential \\
    libjpeg-dev \\
    libcairo2-dev \\
    libgif-dev \\
    libpango1.0-dev \\
    ffmpeg \\
    pkg-config
`);
  process.exit(1);
}

console.log('✅ All system dependencies are available'); 