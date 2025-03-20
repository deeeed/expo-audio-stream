const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { extract } = require('tar');
const AdmZip = require('adm-zip');

// Configuration
const PREBUILT_BINARIES_URL = 'https://github.com/deeeed/rn-essentia-static/archive/refs/heads/main.zip';
const USE_PREBUILT = true; // Set to false to build from source instead

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

// Download pre-built binaries
function downloadPrebuiltBinaries() {
  return new Promise((resolve, reject) => {
    console.log('Downloading pre-built Essentia binaries...');

    const targetDir = path.resolve(__dirname, 'prebuilt');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetFile = path.join(targetDir, 'essentia-binaries.zip');
    const file = fs.createWriteStream(targetFile);

    https.get(PREBUILT_BINARIES_URL, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download binaries: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('Download complete, extracting files...');

        // Extract the downloaded ZIP file
        const extractDir = path.join(targetDir, 'extracted');
        if (!fs.existsSync(extractDir)) {
          fs.mkdirSync(extractDir, { recursive: true });
        }

        // You'll need a library like 'adm-zip' for this
        const zip = new AdmZip(targetFile);
        zip.extractAllTo(extractDir, true);

        // Copy the files from the extracted directory to the correct locations
        const sourcePath = path.join(extractDir, 'rn-essentia-static-main');

        // Copy iOS libraries
        const iosDeviceDir = path.join(__dirname, 'ios/Frameworks/device');
        const iosSimDir = path.join(__dirname, 'ios/Frameworks/simulator');
        fs.mkdirSync(iosDeviceDir, { recursive: true });
        fs.mkdirSync(iosSimDir, { recursive: true });

        if (fs.existsSync(path.join(sourcePath, 'ios/Frameworks/device/Essentia_iOS.a'))) {
          fs.copyFileSync(
            path.join(sourcePath, 'ios/Frameworks/device/Essentia_iOS.a'),
            path.join(iosDeviceDir, 'Essentia_iOS.a')
          );
        }

        if (fs.existsSync(path.join(sourcePath, 'ios/Frameworks/simulator/Essentia_Sim.a'))) {
          fs.copyFileSync(
            path.join(sourcePath, 'ios/Frameworks/simulator/Essentia_Sim.a'),
            path.join(iosSimDir, 'Essentia_Sim.a')
          );
        }

        // Copy Android libraries
        const androidArches = ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'];
        androidArches.forEach(arch => {
          const androidDir = path.join(__dirname, `android/src/main/jniLibs/${arch}`);
          fs.mkdirSync(androidDir, { recursive: true });

          if (fs.existsSync(path.join(sourcePath, `android/jniLibs/${arch}/libessentia.a`))) {
            fs.copyFileSync(
              path.join(sourcePath, `android/jniLibs/${arch}/libessentia.a`),
              path.join(androidDir, 'libessentia.a')
            );
          }
        });

        // Copy C++ headers
        const includeDir = path.join(__dirname, 'cpp/include');
        fs.mkdirSync(includeDir, { recursive: true });

        if (fs.existsSync(path.join(sourcePath, 'cpp/include/essentia'))) {
          copyFolderRecursiveSync(
            path.join(sourcePath, 'cpp/include/essentia'),
            path.join(__dirname, 'cpp/include')
          );
        }

        console.log('Extraction complete');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlinkSync(targetFile);
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

// Add this function
function createFallbackLibrary(platform) {
  console.log(`Creating fallback library for ${platform}...`);

  if (platform === 'ios') {
    const deviceDir = path.resolve(__dirname, 'ios/Frameworks/device');
    const simDir = path.resolve(__dirname, 'ios/Frameworks/simulator');

    fs.mkdirSync(deviceDir, { recursive: true });
    fs.mkdirSync(simDir, { recursive: true });

    // Create dummy static library files
    const dummyLib = Buffer.from('!<arch>\n', 'utf8');
    fs.writeFileSync(path.join(deviceDir, 'Essentia_iOS.a'), dummyLib);
    fs.writeFileSync(path.join(simDir, 'Essentia_Sim.a'), dummyLib);

    console.log('Created fallback iOS libraries');
  } else if (platform === 'android') {
    const archs = ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'];

    archs.forEach(arch => {
      const archDir = path.resolve(__dirname, `android/src/main/jniLibs/${arch}`);
      fs.mkdirSync(archDir, { recursive: true });

      // Create dummy static library file
      const dummyLib = Buffer.from('!<arch>\n', 'utf8');
      fs.writeFileSync(path.join(archDir, 'libessentia.a'), dummyLib);
    });

    console.log('Created fallback Android libraries');
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
