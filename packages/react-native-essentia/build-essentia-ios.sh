#!/bin/bash
set -e

# Check if Essentia repository exists
if [ ! -d "third_party/essentia" ]; then
  echo "Error: Essentia source not found. Please run ./setup.sh first."
  exit 1
fi

# Create output directories for device and simulator
mkdir -p ios/Frameworks/device
mkdir -p ios/Frameworks/simulator

# Check if libraries already exist and skip build if no changes
if [ -f "ios/Frameworks/device/Essentia_iOS.a" ] && [ "$1" != "--force" ]; then
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

# Copy and rename library for device
echo "Copying and renaming library for iOS device..."
cp build/src/libessentia.a ../../ios/Frameworks/device/Essentia_iOS.a

# Also copy for simulator (assuming this is built in the same pass)
# In a proper setup, you might have separate builds for simulator and device
echo "Copying and renaming library for iOS simulator..."
cp build/src/libessentia.a ../../ios/Frameworks/simulator/Essentia_Sim.a

echo "Essentia build for iOS complete!"
