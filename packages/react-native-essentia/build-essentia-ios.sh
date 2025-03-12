#!/bin/bash
set -e

# Check if Essentia repository exists
if [ ! -d "third_party/essentia" ]; then
  echo "Error: Essentia source not found. Please run ./setup.sh first."
  exit 1
fi

# Create output directories - simpler structure now
mkdir -p ios/Frameworks

# Check if library already exists and skip build if no changes
if [ -f "ios/Frameworks/libessentia.a" ] && [ "$1" != "--force" ]; then
  echo "iOS library already exists. Use --force to rebuild."
  exit 0
fi

# Reset environment that might be set from Android builds
unset ANDROID_NDK_HOME
unset ANDROID_ABI
unset CROSS_COMPILE
unset CC
unset CXX

# Make sure we're using the correct Xcode environment
export SDKROOT=$(xcrun --sdk iphoneos --show-sdk-path)
export DEVELOPER_DIR=$(xcode-select -p)

cd third_party/essentia

# Clean any previous builds
python3 waf distclean

# Build for iOS (includes both device and simulator architectures)
echo "Configuring Essentia for iOS..."
python3 waf configure --cross-compile-ios --lightweight= --fft=KISS --build-static

echo "Building Essentia for iOS..."
python3 waf

echo "Copying library for iOS..."
cp build/src/libessentia.a ../../ios/Frameworks/

echo "Essentia build for iOS complete!"
