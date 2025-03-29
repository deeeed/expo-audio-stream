#!/usr/bin/env node

/**
 * @siteed/archiver installation script
 *
 * This script downloads precompiled binaries for the libarchive library
 * if they're not already available or built locally.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { existsSync, mkdirSync } = require('fs');
const { exec } = require('child_process');

// Configuration
const PACKAGE_VERSION = require('./package.json').version;
const LIBARCHIVE_VERSION = '3.7.8'; // This should match the version of libarchive libraries
const BINARY_VERSION = '0.1.0';

// URLs for precompiled binaries
const REPO_URL = 'https://github.com/deeeed/siteed-archiver';
const RELEASE_URL = `${REPO_URL}/releases/download/v${PACKAGE_VERSION}/libarchive-binaries-${LIBARCHIVE_VERSION}-${BINARY_VERSION}.zip`;

// Directories
const SCRIPT_DIR = __dirname;
const PREBUILT_DIR = path.join(SCRIPT_DIR, 'prebuilt');
const IOS_FRAMEWORKS_DIR = path.join(SCRIPT_DIR, 'ios', 'Frameworks');
const DOWNLOAD_PATH = path.join(SCRIPT_DIR, 'libarchive-binaries.zip');
const LIBARCHIVE_DIR = path.join(SCRIPT_DIR, 'third_party', 'libarchive');

// Check if we are in a monorepo
const isMonorepo = existsSync(
  path.join(SCRIPT_DIR, '..', '..', 'package.json')
);

/**
 * Creates a directory if it doesn't exist
 */
function ensureDirExists(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Cleans the libarchive directory to prevent git repository embedding issues
 */
function cleanLibarchiveDir() {
  console.log('Cleaning libarchive directory...');

  // Ensure the directory exists but is empty (except for .gitkeep)
  if (existsSync(LIBARCHIVE_DIR)) {
    // Read all files in the directory
    const files = fs.readdirSync(LIBARCHIVE_DIR);

    // Delete all files except .gitkeep
    for (const file of files) {
      if (file !== '.gitkeep') {
        const filePath = path.join(LIBARCHIVE_DIR, file);
        if (fs.lstatSync(filePath).isDirectory()) {
          // Recursively delete directories
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          // Delete files
          fs.unlinkSync(filePath);
        }
      }
    }
  } else {
    // Create the directory if it doesn't exist
    ensureDirExists(LIBARCHIVE_DIR);
    fs.writeFileSync(path.join(LIBARCHIVE_DIR, '.gitkeep'), '');
  }

  console.log('Libarchive directory cleaned.');
}

/**
 * Downloads a file from a URL with a progress bar
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading from ${url}...`);

    const file = fs.createWriteStream(destPath);

    https
      .get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirects
          downloadFile(response.headers.location, destPath)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        // Create a simple progress bar
        const updateProgress = () => {
          const percentage = Math.round((downloadedSize / totalSize) * 100);
          process.stdout.write(
            `\rDownloading: ${percentage}% [${downloadedSize}/${totalSize} bytes]`
          );
        };

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          updateProgress();
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log('\nDownload completed!');
          resolve();
        });

        file.on('error', (err) => {
          fs.unlinkSync(destPath);
          reject(err);
        });
      })
      .on('error', (err) => {
        fs.unlinkSync(destPath);
        reject(err);
      });
  });
}

/**
 * Extracts a zip file
 */
function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    console.log(`Extracting ${zipPath} to ${destDir}...`);

    if (process.platform === 'win32') {
      // For Windows, use PowerShell's Expand-Archive
      exec(
        `powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`,
        (error) => {
          if (error) {
            reject(error);
            return;
          }
          console.log('Extraction completed!');
          resolve();
        }
      );
    } else {
      // For Unix-like systems, use unzip
      exec(`unzip -o "${zipPath}" -d "${destDir}"`, (error) => {
        if (error) {
          reject(error);
          return;
        }
        console.log('Extraction completed!');
        resolve();
      });
    }
  });
}

/**
 * Checks if prebuilt libs exist
 */
function prebuiltLibsExist() {
  // Check for iOS libraries
  const iosLibsExist = existsSync(
    path.join(IOS_FRAMEWORKS_DIR, 'LibArchive.xcframework')
  );

  // TODO: Add checks for Android libraries when/if they're implemented
  const androidLibsExist = true;

  return iosLibsExist && androidLibsExist;
}

/**
 * Main installation function
 */
async function install() {
  console.log('Starting @siteed/archiver installation...');

  ensureDirExists(PREBUILT_DIR);
  ensureDirExists(IOS_FRAMEWORKS_DIR);

  // Clean libarchive directory to prevent git embedding issues
  cleanLibarchiveDir();

  // Skip installation if running in CI or in monorepo (assuming build scripts will be run manually)
  if (process.env.CI || isMonorepo) {
    console.log('Running in CI or monorepo, skipping automatic download.');
    return;
  }

  // Check if prebuilt libs already exist
  if (prebuiltLibsExist()) {
    console.log('Prebuilt libraries already exist, skipping download.');
    return;
  }

  try {
    // Try to download prebuilt binaries
    try {
      // Download prebuilt binaries
      await downloadFile(RELEASE_URL, DOWNLOAD_PATH);

      // Extract the zip file
      await extractZip(DOWNLOAD_PATH, SCRIPT_DIR);

      // Clean up the zip file
      fs.unlinkSync(DOWNLOAD_PATH);

      console.log('@siteed/archiver installation completed successfully!');
    } catch (downloadError) {
      console.log(
        'Prebuilt binaries not available, falling back to building from source...'
      );
      console.log('This might take a while depending on your system...');

      // Fall back to building from source
      if (process.platform === 'win32') {
        console.log('Building on Windows is not supported automatically.');
        console.log(
          'Please run the build script manually or use a prebuilt binary.'
        );
      } else {
        await new Promise((resolve, reject) => {
          exec('./setup.sh', (error, stdout, stderr) => {
            if (error) {
              console.error(`Build error: ${error.message}`);
              console.error('Please check setup.sh for more details.');
              reject(error);
              return;
            }

            console.log(stdout);
            console.log('Build completed successfully!');
            resolve();
          });
        });
      }
    }
  } catch (error) {
    console.error('Installation failed:', error);
    console.log('Please run setup.sh to build the libraries manually.');

    // Don't exit with an error code, as this would cause npm/yarn to fail
    // but the library might still be usable if the user builds it manually
  }
}

// Run the installation
install();
