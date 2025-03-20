#!/bin/bash
set -e

# Use script location as source directory
SRC_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DEST_DIR="${1:-/Volumes/c910ssd/dev/rn-essentia-static}"
VERSION=$(node -e "console.log(require('${SRC_DIR}/package.json').version)")

echo "===== Essentia Static Libraries Publisher ====="
echo "Source directory: ${SRC_DIR}"
echo "Destination directory: ${DEST_DIR}"

# Check if destination directory exists
if [ ! -d "${DEST_DIR}" ]; then
  echo "❌ Error: Destination directory does not exist."
  echo "Please create the directory first or specify a different path:"
  echo "Usage: $0 [destination_path]"
  exit 1
fi

# Remove any existing .gitattributes file that might be enabling LFS
if [ -f "${DEST_DIR}/.gitattributes" ]; then
  echo "🗑️ Removing existing .gitattributes file to prevent Git LFS tracking"
  rm "${DEST_DIR}/.gitattributes"
fi

# Check if we have built libraries
if [ ! -f "${SRC_DIR}/ios/Frameworks/device/Essentia_iOS.a" ] || [ ! -f "${SRC_DIR}/ios/Frameworks/simulator/Essentia_Sim.a" ]; then
  echo "⚠️ Warning: Some iOS libraries are missing. Run ./build-essentia-ios.sh first for complete results."
fi

ANDROID_LIBS_FOUND=0
for ARCH in "arm64-v8a" "armeabi-v7a" "x86" "x86_64"; do
  if [ -f "${SRC_DIR}/android/src/main/jniLibs/${ARCH}/libessentia.a" ]; then
    ANDROID_LIBS_FOUND=$((ANDROID_LIBS_FOUND + 1))
  fi
done

if [ $ANDROID_LIBS_FOUND -lt 1 ]; then
  echo "⚠️ Warning: No Android libraries found. Run ./build-essentia-android.sh --all first for complete results."
fi

# Create directory structure in destination
echo "Creating directory structure..."
mkdir -p "${DEST_DIR}/ios/Frameworks/device"
mkdir -p "${DEST_DIR}/ios/Frameworks/simulator"
mkdir -p "${DEST_DIR}/android/jniLibs/arm64-v8a"
mkdir -p "${DEST_DIR}/android/jniLibs/armeabi-v7a"
mkdir -p "${DEST_DIR}/android/jniLibs/x86"
mkdir -p "${DEST_DIR}/android/jniLibs/x86_64"
mkdir -p "${DEST_DIR}/cpp/include"

# Copy iOS libraries
echo "Copying iOS libraries..."
if [ -f "${SRC_DIR}/ios/Frameworks/device/Essentia_iOS.a" ]; then
  cp "${SRC_DIR}/ios/Frameworks/device/Essentia_iOS.a" "${DEST_DIR}/ios/Frameworks/device/"
  echo "✅ Copied iOS device library"
else
  echo "⚠️ iOS device library not found. Did you run build-essentia-ios.sh?"
fi

if [ -f "${SRC_DIR}/ios/Frameworks/simulator/Essentia_Sim.a" ]; then
  cp "${SRC_DIR}/ios/Frameworks/simulator/Essentia_Sim.a" "${DEST_DIR}/ios/Frameworks/simulator/"
  echo "✅ Copied iOS simulator library"
else
  echo "⚠️ iOS simulator library not found. Did you run build-essentia-ios.sh?"
fi

# Copy Android libraries
echo "Copying Android libraries..."
for ARCH in "arm64-v8a" "armeabi-v7a" "x86" "x86_64"; do
  if [ -f "${SRC_DIR}/android/src/main/jniLibs/${ARCH}/libessentia.a" ]; then
    cp "${SRC_DIR}/android/src/main/jniLibs/${ARCH}/libessentia.a" "${DEST_DIR}/android/jniLibs/${ARCH}/"
    echo "✅ Copied Android ${ARCH} library"
  else
    echo "⚠️ Android ${ARCH} library not found. Did you run build-essentia-android.sh --all?"
  fi
done

# Copy C++ headers
echo "Copying C++ headers..."
if [ -d "${SRC_DIR}/cpp/include/essentia" ]; then
  cp -r "${SRC_DIR}/cpp/include/essentia" "${DEST_DIR}/cpp/include/"
  echo "✅ Copied C++ headers"
else
  echo "⚠️ C++ headers not found. Did you run setup.sh?"
fi

# Create version file with timestamp
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
echo "{\"version\":\"${VERSION}\",\"built\":\"${TIMESTAMP}\"}" > "${DEST_DIR}/version.json"
echo "✅ Created version.json with version ${VERSION}"

# Create README.md
cat > "${DEST_DIR}/README.md" << EOF
# Essentia Static Libraries

This repository contains pre-built static libraries for the [Essentia](https://essentia.upf.edu/) audio analysis library, specifically compiled for use with React Native.

## Structure

- \`ios/\`: Contains static libraries for iOS (device and simulator)
- \`android/\`: Contains static libraries for Android (multiple architectures)
- \`cpp/include/\`: Contains C++ header files needed for compilation

## Usage

These binary files are meant to be used with [@siteed/react-native-essentia](https://www.npmjs.com/package/@siteed/react-native-essentia).

## Version

These libraries are built from Essentia version 2.1_beta5.
Last built: ${TIMESTAMP}
Package version: ${VERSION}

## Building

These libraries were built and published using:
1. \`./setup.sh\` - Sets up the Essentia source code
2. \`./build-essentia-ios.sh\` - Builds iOS libraries
3. \`./build-essentia-android.sh --all\` - Builds Android libraries
4. \`./publish-static-libs.sh\` - Copies libraries to this repository

## License

The Essentia library is licensed under the Affero GPLv3 license. See the [Essentia project](https://github.com/MTG/essentia) for more details.
EOF

echo "✅ Created README.md"

echo "✅ Done! Files copied to ${DEST_DIR}"
echo ""
echo "Next steps:"
echo "1. Navigate to ${DEST_DIR}"
echo "2. Run this command to completely uninstall Git LFS from the repository:"
echo "   git lfs uninstall"
echo "3. Make sure there is NO .gitattributes file in your repository"
echo "   rm -f .gitattributes"
echo "4. Delete any existing LFS-tracked files if they exist:"
echo "   rm -f ios/Frameworks/device/*.a ios/Frameworks/simulator/*.a android/jniLibs/*/*.a"
echo "5. Add your files: git add ."
echo "6. Commit: git commit -m \"Update Essentia static libraries (v${VERSION}) WITHOUT Git LFS\""
echo "7. Push to GitHub: git push origin main"
echo ""
echo "This will make the libraries available directly in the repository WITHOUT using Git LFS"