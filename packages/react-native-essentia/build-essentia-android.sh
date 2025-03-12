#!/bin/bash
set -e

# Check if Essentia repository exists
if [ ! -d "third_party/essentia" ]; then
  echo "Error: Essentia source not found. Please run ./setup.sh first."
  exit 1
fi

# If ANDROID_ABI is not set, default to arm64-v8a
if [ -z "$ANDROID_ABI" ]; then
  ANDROID_ABI="arm64-v8a"
  echo "ANDROID_ABI not set, defaulting to $ANDROID_ABI"
fi

# Create output directory
mkdir -p android/src/main/jniLibs/${ANDROID_ABI}

# Check if library already exists and skip build if no changes
if [ -f "android/src/main/jniLibs/${ANDROID_ABI}/libessentia.a" ] && [ "$1" != "--force" ]; then
  echo "Library for ${ANDROID_ABI} already exists. Use --force to rebuild."
  exit 0
fi

cd third_party/essentia

echo "Configuring Essentia for Android (${ANDROID_ABI})..."
python3 waf configure --cross-compile-android --lightweight= --fft=KISS --build-static

echo "Building Essentia..."
python3 waf

echo "Copying library for Android..."
find build -name "libessentia*.a" -exec cp {} ../../android/src/main/jniLibs/${ANDROID_ABI}/ \;

echo "Essentia build for Android (${ANDROID_ABI}) complete!"
