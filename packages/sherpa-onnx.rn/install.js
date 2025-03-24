#!/usr/bin/env node

/**
 * Sherpa-onnx installation script
 * 
 * This script downloads precompiled binaries for the Sherpa-onnx library
 * if they're not already available or built locally.
 */
 
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const AdmZip = require('adm-zip');
const { existsSync, mkdirSync } = require('fs');
const { exec } = require('child_process');
const ProgressBar = require('progress');

// Configuration
const PACKAGE_VERSION = require('./package.json').version;
const BINARY_VERSION = '0.1.0'; // This should match the version of Sherpa-onnx libraries

// URLs for precompiled binaries
const REPO_URL = 'https://github.com/deeeed/expo-audio-stream';
const RELEASE_URL = `${REPO_URL}/releases/download/v${PACKAGE_VERSION}/sherpa-onnx-binaries-${BINARY_VERSION}.zip`;

// Directories
const SCRIPT_DIR = __dirname;
const PREBUILT_DIR = path.join(SCRIPT_DIR, 'prebuilt');
const DOWNLOAD_PATH = path.join(SCRIPT_DIR, 'sherpa-onnx-binaries.zip');

// Check if we are in a monorepo
const isMonorepo = existsSync(path.join(SCRIPT_DIR, '..', '..', 'package.json'));

/**
 * Creates a directory if it doesn't exist
 */
function ensureDirExists(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Downloads a file from a URL
 */
async function downloadFile(url, destPath) {
  try {
    console.log(`Downloading from ${url}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }
    
    const totalSize = parseInt(response.headers.get('content-length'), 10);
    let downloadedSize = 0;
    
    const bar = new ProgressBar('[:bar] :percent :etas', {
      complete: '=',
      incomplete: ' ',
      width: 50,
      total: totalSize,
    });
    
    const fileStream = fs.createWriteStream(destPath);
    
    return new Promise((resolve, reject) => {
      response.body.on('data', (chunk) => {
        downloadedSize += chunk.length;
        bar.tick(chunk.length);
      });
      
      response.body.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log('Download completed!');
        resolve();
      });
      
      fileStream.on('error', (err) => {
        fs.unlinkSync(destPath);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}

/**
 * Extracts a zip file
 */
function extractZip(zipPath, destDir) {
  try {
    console.log(`Extracting ${zipPath} to ${destDir}...`);
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(destDir, true);
    console.log('Extraction completed!');
  } catch (error) {
    console.error('Error extracting zip:', error);
    throw error;
  }
}

/**
 * Checks if prebuilt libs exist
 */
function prebuiltLibsExist() {
  // Check for iOS libraries
  const iosLibsExist = existsSync(path.join(PREBUILT_DIR, 'ios', 'libsherpa-onnx.a'));
  
  // Check for Android libraries
  const androidLibsExist = existsSync(path.join(PREBUILT_DIR, 'android', 'arm64-v8a', 'libsherpa-onnx.so')) &&
                           existsSync(path.join(PREBUILT_DIR, 'android', 'armeabi-v7a', 'libsherpa-onnx.so')) &&
                           existsSync(path.join(PREBUILT_DIR, 'android', 'x86', 'libsherpa-onnx.so')) &&
                           existsSync(path.join(PREBUILT_DIR, 'android', 'x86_64', 'libsherpa-onnx.so'));
  
  return iosLibsExist && androidLibsExist;
}

/**
 * Main installation function
 */
async function install() {
  console.log('Starting Sherpa-onnx installation...');
  
  ensureDirExists(PREBUILT_DIR);
  
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
    // Download prebuilt binaries
    await downloadFile(RELEASE_URL, DOWNLOAD_PATH);
    
    // Extract the zip file
    extractZip(DOWNLOAD_PATH, SCRIPT_DIR);
    
    // Clean up the zip file
    fs.unlinkSync(DOWNLOAD_PATH);
    
    console.log('Sherpa-onnx installation completed successfully!');
  } catch (error) {
    console.error('Installation failed:', error);
    console.log('Please run ./build-ios.sh and/or ./build-android.sh to build the libraries manually.');
    
    // Don't exit with an error code, as this would cause npm/yarn to fail
    // but the library might still be usable if the user builds it manually
  }
}

// Run the installation
install(); 