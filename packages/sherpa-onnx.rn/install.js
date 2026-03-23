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
const BINARY_VERSION = require('./package.json').sherpaOnnxVersion; // Matches the bundled sherpa-onnx upstream version

// URLs for precompiled binaries
const REPO_URL = 'https://github.com/deeeed/audiolab';
const RELEASE_URL = `${REPO_URL}/releases/download/sherpa-onnx-prebuilt-v${BINARY_VERSION}/sherpa-onnx-binaries-${BINARY_VERSION}.zip`;

// Directories
const SCRIPT_DIR = __dirname;
const PREBUILT_DIR = path.join(SCRIPT_DIR, 'prebuilt');
const DOWNLOAD_PATH = path.join(SCRIPT_DIR, 'sherpa-onnx-binaries.zip');

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
  const iosLibsExist = existsSync(path.join(PREBUILT_DIR, 'ios', 'device', 'libsherpa-onnx-core.a'));

  // Check for Android libraries (x86 not shipped; only arm64-v8a, armeabi-v7a, x86_64)
  const androidLibsExist =
    existsSync(path.join(PREBUILT_DIR, 'android', 'arm64-v8a', 'libsherpa-onnx-jni.so')) &&
    existsSync(path.join(PREBUILT_DIR, 'android', 'armeabi-v7a', 'libsherpa-onnx-jni.so')) &&
    existsSync(path.join(PREBUILT_DIR, 'android', 'x86_64', 'libsherpa-onnx-jni.so'));

  return iosLibsExist && androidLibsExist;
}

/**
 * Main installation function
 */
async function install() {
  console.log('Starting Sherpa-onnx installation...');
  
  ensureDirExists(PREBUILT_DIR);
  
  // Allow explicit opt-out for developers who build locally
  if (process.env.SKIP_SHERPA_DOWNLOAD === '1') {
    console.log('SKIP_SHERPA_DOWNLOAD=1, skipping download.');
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
    console.error(`Installation failed — could not download prebuilt binaries from: ${RELEASE_URL}`, error);
    console.log('If the release asset does not exist, build manually:');
    console.log('  ./setup.sh && ./build-sherpa-ios.sh && ./build-sherpa-android.sh');
    
    // Don't exit with an error code, as this would cause npm/yarn to fail
    // but the library might still be usable if the user builds it manually
  }
}

// Run the installation
install(); 