const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const fetch = require('node-fetch');
const ProgressBar = require('progress');

// Configuration
const PREBUILT_BINARIES_URL = 'https://github.com/deeeed/rn-essentia-static/archive/refs/heads/main.zip';
const USE_PREBUILT = process.env.USE_PREBUILT !== 'false'; // Can be overridden with environment variable

// Helper to run shell commands
function runCommand(command) {
  try {
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Failed to run command: ${command}`);
    console.error(error);
    return false;
  }
}

// Download pre-built binaries with progress tracking
function downloadPrebuiltBinaries() {
  return new Promise((resolve, reject) => {
    console.log('Downloading pre-built Essentia binaries...');

    const targetDir = path.resolve(__dirname, 'prebuilt');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetFile = path.join(targetDir, 'essentia-binaries.zip');

    // Use node-fetch with redirect following
    fetch(PREBUILT_BINARIES_URL, {
      redirect: 'follow',
      // Some GitHub URLs require a user agent
      headers: { 'User-Agent': 'react-native-essentia-installer' }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to download binaries: ${response.status} ${response.statusText}`);
        }

        // Get content length for progress bar
        const contentLength = response.headers.get('content-length');
        const totalBytes = parseInt(contentLength || '0', 10);

        // Create progress bar if content length is known
        let progressBar;
        if (totalBytes > 0) {
          progressBar = new ProgressBar('Downloading [:bar] :percent :etas', {
            complete: '=',
            incomplete: ' ',
            width: 30,
            total: totalBytes
          });
        } else {
          console.log('Content length unknown, download progress will not be shown');
        }

        // Set up file stream
        const fileStream = fs.createWriteStream(targetFile);

        // Track downloaded bytes
        let downloadedBytes = 0;

        // Handle data chunks and update progress
        response.body.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (progressBar) {
            progressBar.tick(chunk.length);
          } else if (downloadedBytes % (1024 * 1024) === 0) {
            // If we don't have a progress bar, at least log progress every MB
            console.log(`Downloaded ${(downloadedBytes / (1024 * 1024)).toFixed(2)} MB`);
          }
        });

        // Pipe response to file and handle completion
        response.body.pipe(fileStream);

        return new Promise((resolveDownload, rejectDownload) => {
          fileStream.on('finish', resolveDownload);
          fileStream.on('error', rejectDownload);
          response.body.on('error', rejectDownload);
        });
      })
      .then(() => {
        console.log('\nDownload complete, extracting files...');

        // Extract the downloaded ZIP file
        const extractDir = path.join(targetDir, 'extracted');
        if (!fs.existsSync(extractDir)) {
          fs.mkdirSync(extractDir, { recursive: true });
        }

        try {
          // Extract with adm-zip
          console.log(`Extracting zip file: ${targetFile}`);
          const zip = new AdmZip(targetFile);
          zip.extractAllTo(extractDir, true);

          // Show extracted file count
          console.log(`Extracted ${zip.getEntries().length} files to ${extractDir}`);
        } catch (error) {
          console.error('Error extracting zip file:', error);
          throw error;
        }

        // Copy the files from the extracted directory to the correct locations
        const sourcePath = path.join(extractDir, 'rn-essentia-static-main');
        if (!fs.existsSync(sourcePath)) {
          const extractedItems = fs.readdirSync(extractDir);
          console.log('Available extracted items:', extractedItems);

          // Try to find a directory containing 'essentia-static' in the name
          const essentiaDirs = extractedItems.filter(item =>
            fs.statSync(path.join(extractDir, item)).isDirectory() &&
            item.includes('essentia-static')
          );

          if (essentiaDirs.length > 0) {
            console.log(`Using alternative source path: ${essentiaDirs[0]}`);
            sourcePath = path.join(extractDir, essentiaDirs[0]);
          } else {
            throw new Error('Could not find extracted source directory');
          }
        }

        // Copy iOS libraries
        const iosDeviceDir = path.join(__dirname, 'ios/Frameworks/device');
        const iosSimDir = path.join(__dirname, 'ios/Frameworks/simulator');
        fs.mkdirSync(iosDeviceDir, { recursive: true });
        fs.mkdirSync(iosSimDir, { recursive: true });

        const iosDeviceSrc = path.join(sourcePath, 'ios/Frameworks/device/Essentia_iOS.a');
        const iosSimX86Src = path.join(sourcePath, 'ios/Frameworks/simulator/Essentia_Sim_x86_64.a');
        const iosSimArm64Src = path.join(sourcePath, 'ios/Frameworks/simulator/Essentia_Sim_arm64.a');

        if (fs.existsSync(iosDeviceSrc)) {
          console.log(`Copying iOS device library from ${iosDeviceSrc}`);
          fs.copyFileSync(iosDeviceSrc, path.join(iosDeviceDir, 'Essentia_iOS.a'));
        } else {
          console.warn('iOS device library not found in downloaded package');
          createFallbackLibrary('ios-device');
        }

        let hasSimulatorLibs = false;

        // Copy the individual architecture files if they exist
        if (fs.existsSync(iosSimX86Src)) {
          console.log(`Copying iOS x86_64 simulator library from ${iosSimX86Src}`);
          fs.copyFileSync(iosSimX86Src, path.join(iosSimDir, 'Essentia_Sim_x86_64.a'));
          hasSimulatorLibs = true;
        } else {
          console.warn('iOS x86_64 simulator library not found in downloaded package');
        }

        if (fs.existsSync(iosSimArm64Src)) {
          console.log(`Copying iOS arm64 simulator library from ${iosSimArm64Src}`);
          fs.copyFileSync(iosSimArm64Src, path.join(iosSimDir, 'Essentia_Sim_arm64.a'));
          hasSimulatorLibs = true;
        } else {
          console.warn('iOS arm64 simulator library not found in downloaded package');
        }

        // Create the combined simulator library if both architecture files were copied and we're on macOS
        if (hasSimulatorLibs && fs.existsSync(path.join(iosSimDir, 'Essentia_Sim_x86_64.a')) &&
            fs.existsSync(path.join(iosSimDir, 'Essentia_Sim_arm64.a')) && process.platform === 'darwin') {
          try {
            console.log('Creating combined iOS simulator library...');
            execSync(`xcrun lipo -create "${path.join(iosSimDir, 'Essentia_Sim_x86_64.a')}" "${path.join(iosSimDir, 'Essentia_Sim_arm64.a')}" -output "${path.join(iosSimDir, 'Essentia_Sim.a')}"`,
                    { stdio: 'inherit' });
            console.log('Successfully created combined iOS simulator library');
          } catch (error) {
            console.error('Failed to create combined simulator library:', error);
            // If we fail to create the combined library, we'll create a fallback one
            createFallbackLibrary('ios-simulator-combined');
          }
        } else if (!hasSimulatorLibs) {
          // If we couldn't find any simulator libraries, create fallbacks for all
          console.warn('No iOS simulator libraries found, creating fallbacks');
          createFallbackLibrary('ios-simulator');
        }

        // Copy Android libraries
        const androidArches = ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'];
        androidArches.forEach(arch => {
          const androidDir = path.join(__dirname, `android/src/main/jniLibs/${arch}`);
          fs.mkdirSync(androidDir, { recursive: true });

          const androidSrc = path.join(sourcePath, `android/jniLibs/${arch}/libessentia.a`);
          if (fs.existsSync(androidSrc)) {
            console.log(`Copying Android ${arch} library`);
            fs.copyFileSync(androidSrc, path.join(androidDir, 'libessentia.a'));
          } else {
            console.warn(`Android ${arch} library not found in downloaded package`);
            createFallbackLibrary(`android-${arch}`);
          }
        });

        // Copy C++ headers
        const includeDir = path.join(__dirname, 'cpp/include');
        fs.mkdirSync(includeDir, { recursive: true });

        const headersSrc = path.join(sourcePath, 'cpp/include/essentia');
        if (fs.existsSync(headersSrc)) {
          console.log('Copying C++ headers');
          copyFolderRecursiveSync(headersSrc, path.join(__dirname, 'cpp/include'));
        } else {
          console.warn('C++ headers not found in downloaded package');
          // TODO: Create fallback headers if needed
        }

        console.log('Extraction and file copying complete');
        resolve();
      })
      .catch(err => {
        console.error('Download or extraction error:', err);
        if (fs.existsSync(targetFile)) {
          try {
            fs.unlinkSync(targetFile);
            console.log('Cleaned up incomplete download file');
          } catch (cleanupErr) {
            console.warn('Failed to clean up download file:', cleanupErr);
          }
        }
        reject(err);
      });
  });
}

// Helper function to recursively copy folders
function copyFolderRecursiveSync(source, target) {
  // Check if source exists
  if (!fs.existsSync(source)) {
    return;
  }

  // Create target directory if it doesn't exist
  const targetFolder = path.join(target, path.basename(source));
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  // Copy all files and recursively copy subdirectories
  const files = fs.readdirSync(source);
  files.forEach(file => {
    const currentPath = path.join(source, file);
    if (fs.lstatSync(currentPath).isDirectory()) {
      copyFolderRecursiveSync(currentPath, targetFolder);
    } else {
      fs.copyFileSync(currentPath, path.join(targetFolder, file));
    }
  });
}

// Modified createFallbackLibrary to support specific platform components
function createFallbackLibrary(platform) {
  console.log(`Creating fallback library for ${platform}...`);

  const dummyLib = Buffer.from('!<arch>\n', 'utf8');

  if (platform === 'ios' || platform === 'ios-device') {
    const deviceDir = path.resolve(__dirname, 'ios/Frameworks/device');
    fs.mkdirSync(deviceDir, { recursive: true });
    fs.writeFileSync(path.join(deviceDir, 'Essentia_iOS.a'), dummyLib);
    console.log('Created fallback iOS device library');
  }

  if (platform === 'ios' || platform === 'ios-simulator') {
    const simDir = path.resolve(__dirname, 'ios/Frameworks/simulator');
    fs.mkdirSync(simDir, { recursive: true });

    // Create both individual architecture files
    fs.writeFileSync(path.join(simDir, 'Essentia_Sim_x86_64.a'), dummyLib);
    fs.writeFileSync(path.join(simDir, 'Essentia_Sim_arm64.a'), dummyLib);

    // Also create the combined file
    fs.writeFileSync(path.join(simDir, 'Essentia_Sim.a'), dummyLib);

    console.log('Created fallback iOS simulator libraries');
  } else if (platform === 'ios-simulator-combined') {
    // Only create the combined simulator library
    const simDir = path.resolve(__dirname, 'ios/Frameworks/simulator');
    fs.mkdirSync(simDir, { recursive: true });
    fs.writeFileSync(path.join(simDir, 'Essentia_Sim.a'), dummyLib);
    console.log('Created fallback combined iOS simulator library');
  }

  if (platform === 'android') {
    const archs = ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'];
    archs.forEach(arch => {
      const archDir = path.resolve(__dirname, `android/src/main/jniLibs/${arch}`);
      fs.mkdirSync(archDir, { recursive: true });
      fs.writeFileSync(path.join(archDir, 'libessentia.a'), dummyLib);
    });
    console.log('Created fallback Android libraries for all architectures');
  } else if (platform.startsWith('android-')) {
    // Handle individual Android architecture
    const arch = platform.substring('android-'.length);
    const archDir = path.resolve(__dirname, `android/src/main/jniLibs/${arch}`);
    fs.mkdirSync(archDir, { recursive: true });
    fs.writeFileSync(path.join(archDir, 'libessentia.a'), dummyLib);
    console.log(`Created fallback Android library for ${arch}`);
  }
}

// Add this function
function isIOSDevelopmentEnvironment() {
  // Check if running on macOS
  if (process.platform !== 'darwin') return false;

  // Check if Xcode command line tools are installed
  try {
    execSync('xcode-select -p', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

// Test installation to verify files are present
function testInstallation() {
  const problems = [];
  console.log('\nVerifying installation...');

  // Check iOS libraries
  const iosDeviceLib = path.join(__dirname, 'ios/Frameworks/device/Essentia_iOS.a');
  const iosSimLibX86 = path.join(__dirname, 'ios/Frameworks/simulator/Essentia_Sim_x86_64.a');
  const iosSimLibArm64 = path.join(__dirname, 'ios/Frameworks/simulator/Essentia_Sim_arm64.a');
  const iosSimLib = path.join(__dirname, 'ios/Frameworks/simulator/Essentia_Sim.a');

  if (!fs.existsSync(iosDeviceLib)) {
    problems.push('iOS device library is missing');
  } else {
    const stats = fs.statSync(iosDeviceLib);
    console.log(`✅ iOS device library: OK (${formatFileSize(stats.size)})`);
  }

  // Check for the individual architecture files first
  let hasIndividualArchs = true;
  if (!fs.existsSync(iosSimLibX86)) {
    problems.push('iOS x86_64 simulator library is missing');
    hasIndividualArchs = false;
  } else {
    const stats = fs.statSync(iosSimLibX86);
    console.log(`✅ iOS x86_64 simulator library: OK (${formatFileSize(stats.size)})`);
  }

  if (!fs.existsSync(iosSimLibArm64)) {
    problems.push('iOS arm64 simulator library is missing');
    hasIndividualArchs = false;
  } else {
    const stats = fs.statSync(iosSimLibArm64);
    console.log(`✅ iOS arm64 simulator library: OK (${formatFileSize(stats.size)})`);
  }

  // Check if we need to create the combined file
  if (hasIndividualArchs && !fs.existsSync(iosSimLib) && process.platform === 'darwin') {
    console.log('Individual architecture files exist but combined file is missing. Creating combined file...');
    try {
      execSync(`xcrun lipo -create "${iosSimLibX86}" "${iosSimLibArm64}" -output "${iosSimLib}"`,
              { stdio: 'inherit' });
      console.log(`✅ Created combined iOS simulator library`);
    } catch (error) {
      console.error('Failed to create combined simulator library:', error);
      problems.push('Failed to create combined iOS simulator library');
    }
  } else if (fs.existsSync(iosSimLib)) {
    const stats = fs.statSync(iosSimLib);
    console.log(`✅ iOS combined simulator library: OK (${formatFileSize(stats.size)})`);
  } else if (!hasIndividualArchs) {
    problems.push('iOS simulator libraries are incomplete');
  }

  // Check Android libraries
  const androidArchs = ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'];
  for (const arch of androidArchs) {
    const androidLib = path.join(__dirname, `android/src/main/jniLibs/${arch}/libessentia.a`);
    if (!fs.existsSync(androidLib)) {
      problems.push(`Android ${arch} library is missing`);
    } else {
      const stats = fs.statSync(androidLib);
      console.log(`✅ Android ${arch} library: OK (${formatFileSize(stats.size)})`);
    }
  }

  // Check headers
  const headersDir = path.join(__dirname, 'cpp/include/essentia');
  if (!fs.existsSync(headersDir)) {
    problems.push('C++ headers are missing');
  } else {
    const headerFiles = countFilesInDirectory(headersDir);
    console.log(`✅ C++ headers: OK (${headerFiles} files)`);
  }

  // Report results
  if (problems.length === 0) {
    console.log('\n🎉 Installation verification successful! All files are present.');
    return true;
  } else {
    console.log('\n⚠️ Installation verification found problems:');
    problems.forEach(p => console.log(`  - ${p}`));
    console.log('\nThe package may not work correctly. Check the logs for errors.');
    return false;
  }
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  else return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Helper function to count files in a directory recursively
function countFilesInDirectory(dir) {
  let count = 0;

  function countRecursive(currentDir) {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      if (fs.statSync(itemPath).isDirectory()) {
        countRecursive(itemPath);
      } else {
        count++;
      }
    }
  }

  countRecursive(dir);
  return count;
}

// Main function
async function setupEssentia() {
  console.log('Setting up react-native-essentia...');

  if (USE_PREBUILT) {
    try {
      await downloadPrebuiltBinaries();
      console.log('Successfully set up using pre-built binaries');
    } catch (error) {
      console.error('Failed to download pre-built binaries:', error);
      console.log('Falling back to building from source...');
      setupFromSource();
    }
  } else {
    setupFromSource();
  }

  // Test the installation
  const success = testInstallation();

  if (success) {
    console.log('\nEssentia setup complete!');
  } else {
    console.warn('\nEssentia setup completed with warnings.');
  }
}

// Build from source
function setupFromSource() {
  console.log('Setting up Essentia from source...');

  // Run the setup script
  if (!runCommand('bash ./setup.sh')) {
    console.error('Failed to run setup script');
    process.exit(1);
  }

  // Build for iOS only if in an iOS development environment
  if (isIOSDevelopmentEnvironment()) {
    const iosSuccess = runCommand('bash ./build-essentia-ios.sh');
    if (!iosSuccess) {
      console.warn('Failed to build for iOS, creating fallback library');
      createFallbackLibrary('ios');
    } else {
      console.log('Successfully built for iOS');
    }
  } else {
    console.log('Not a macOS environment, creating fallback iOS library');
    createFallbackLibrary('ios');
  }

  // Always attempt to build for Android
  const androidSuccess = runCommand('bash ./build-essentia-android.sh');
  if (!androidSuccess) {
    console.warn('Failed to build for Android, creating fallback library');
    createFallbackLibrary('android');
  } else {
    console.log('Successfully built for Android');
  }

  console.log('Essentia setup complete!');
}

// Run the setup
setupEssentia().catch(err => {
  console.error('Failed to set up Essentia:', err);
  process.exit(1);
});
