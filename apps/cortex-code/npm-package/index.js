#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Path to the cortex-code binary
const binaryPath = path.join(__dirname, 'bin', 'cortex-code');

// Export a function to run cortex-code
function run(args = []) {
  return spawn(binaryPath, args, {
    stdio: 'inherit',
  });
}

// If this file is run directly, pass through to the binary
if (require.main === module) {
  const child = run(process.argv.slice(2));

  // Handle process signals
  process.on('SIGINT', () => {
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
  });

  child.on('close', (code) => {
    process.exit(code);
  });
}

module.exports = {
  run,
};
