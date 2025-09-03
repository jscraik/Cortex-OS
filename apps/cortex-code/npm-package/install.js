#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const zlib = require('zlib');
const tar = require('tar');
const packageJson = require('./package.json');

const { version } = packageJson;
const binPath = path.join(__dirname, 'bin');
const binaryPath = path.join(binPath, 'cortex-code');

// Platform and architecture mapping
const platform = os.platform();
const arch = os.arch();

// Map Node.js platform/arch to our binary naming convention
const platformMap = {
  darwin: {
    x64: 'x86_64-apple-darwin',
    arm64: 'aarch64-apple-darwin',
  },
  linux: {
    x64: 'x86_64-unknown-linux-musl',
    arm64: 'aarch64-unknown-linux-musl',
  },
  win32: {
    x64: 'x86_64-pc-windows-msvc',
    arm64: 'aarch64-pc-windows-msvc',
  },
};

function getBinaryName() {
  const platformName = platformMap[platform]?.[arch];
  if (!platformName) {
    throw new Error(`Unsupported platform: ${platform} ${arch}`);
  }

  const ext = platform === 'win32' ? '.exe' : '';
  return `cortex-code-${platformName}${ext}`;
}

function getDownloadUrl() {
  const binaryName = getBinaryName();
  const archiveName = `${binaryName}.tar.gz`;
  return `https://github.com/jamiescottcraik/Cortex-OS/releases/download/v${version}/${archiveName}`;
}

function downloadBinary(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);

    https
      .get(url, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(destination);
          });
        } else if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirect
          downloadBinary(response.headers.location, destination).then(resolve).catch(reject);
        } else {
          reject(
            new Error(
              `Failed to download binary: ${response.statusCode} ${response.statusMessage}`,
            ),
          );
        }
      })
      .on('error', (err) => {
        fs.unlink(destination, () => {}); // Delete partial file
        reject(err);
      });
  });
}

async function extractBinary(archivePath, extractPath) {
  return tar.extract({
    gzip: true,
    file: archivePath,
    cwd: extractPath,
  });
}

async function install() {
  try {
    // Create bin directory if it doesn't exist
    if (!fs.existsSync(binPath)) {
      fs.mkdirSync(binPath, { recursive: true });
    }

    // Get binary info
    const binaryName = getBinaryName();
    const binaryExt = path.extname(binaryName);
    const extractedName = `cortex-code${binaryExt}`;

    // Paths
    const archivePath = path.join(binPath, `${binaryName}.tar.gz`);
    const extractedPath = path.join(binPath, extractedName);

    console.log(`Downloading cortex-code for ${platform} ${arch}...`);

    // Download binary
    const url = getDownloadUrl();
    await downloadBinary(url, archivePath);

    // Extract binary
    console.log('Extracting binary...');
    await extractBinary(archivePath, binPath);

    // Rename to cortex-code
    if (fs.existsSync(extractedPath)) {
      fs.renameSync(extractedPath, binaryPath);
    }

    // Make binary executable (not needed on Windows)
    if (platform !== 'win32') {
      fs.chmodSync(binaryPath, 0o755);
    }

    // Clean up archive
    fs.unlinkSync(archivePath);

    console.log('Installation complete!');
    console.log(`You can now use the 'cortex-code' command.`);
  } catch (error) {
    console.error('Installation failed:', error.message);
    process.exit(1);
  }
}

// Check if this is a preinstall or postinstall script
const args = process.argv.slice(2);
if (args.includes('--check')) {
  // Preinstall check - just verify platform support
  try {
    getBinaryName();
    process.exit(0);
  } catch (error) {
    console.error('Unsupported platform:', error.message);
    process.exit(1);
  }
} else {
  // Postinstall - actually install the binary
  install();
}
