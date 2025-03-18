#!/bin/bash
set -e  # Exit on any error

# Check if Essentia repository exists
if [ ! -d "third_party/essentia" ]; then
  echo "Error: Essentia source not found. Please run ./setup.sh first."
  exit 1
fi

# Create output directories for device and simulator
mkdir -p ios/Frameworks/device
mkdir -p ios/Frameworks/simulator

# Check if libraries already exist and skip build unless --force is used
if [ -f "ios/Frameworks/device/Essentia_iOS.a" ] && [ -f "ios/Frameworks/simulator/Essentia_Sim.a" ] && [ "$1" != "--force" ]; then
  echo "iOS libraries already exist. Use --force to rebuild."
  exit 0
fi

# Reset environment that might be set from Android builds
unset ANDROID_NDK_HOME
unset ANDROID_ABI
unset CROSS_COMPILE
unset CC
unset CXX

# Set Xcode environment
export SDKROOT=$(xcrun --sdk iphoneos --show-sdk-path)
export DEVELOPER_DIR=$(xcode-select -p)

cd third_party/essentia

# Clean any previous builds
echo "Cleaning previous builds..."
python3 waf distclean

# Build for iOS devices
echo "Configuring Essentia for iOS devices..."
python3 waf configure --cross-compile-ios --lightweight= --fft=ACCELERATE --build-static  #--mode=debug #--include-algos=MonoLoader,Windowing,Spectrum,MFCC
if [ $? -ne 0 ]; then
  echo "Error: Configuration for iOS devices failed. Check waf logs."
  exit 1
fi

echo "Building Essentia for iOS devices..."
python3 waf --verbose
if [ $? -ne 0 ]; then
  echo "Error: Build for iOS devices failed. Check waf logs."
  exit 1
fi

echo "Copying library for iOS devices..."
cp build/src/libessentia.a ../../ios/Frameworks/device/Essentia_iOS.a

# Clean and rebuild for simulator
echo "Cleaning for simulator build..."
python3 waf distclean

# Build for iOS simulator
echo "Configuring Essentia for iOS simulator..."
python3 waf configure --cross-compile-ios-sim --lightweight= --fft=ACCELERATE --build-static  #--mode=debug #--include-algos=MonoLoader,Windowing,Spectrum,MFCC
if [ $? -ne 0 ]; then
  echo "Error: Configuration for iOS simulator failed. Check waf logs."
  exit 1
fi

echo "Building Essentia for iOS simulator..."
python3 waf --verbose
if [ $? -ne 0 ]; then
  echo "Error: Build for iOS simulator failed. Check waf logs."
  exit 1
fi

echo "Copying library for iOS simulator..."
cp build/src/libessentia.a ../../ios/Frameworks/simulator/Essentia_Sim.a

# Verify the library architecture and symbols
echo "Verifying Essentia_iOS.a architecture..."
lipo -info ../../ios/Frameworks/device/Essentia_iOS.a
if [ $? -ne 0 ]; then
  echo "Error: Essentia_iOS.a is not a valid single-architecture file."
  exit 1
fi

echo "Verifying symbols in Essentia_iOS.a..."
if nm -gU ../../ios/Frameworks/device/Essentia_iOS.a | grep -q "_ZN8essentia4initEv"; then
  echo "Success: Symbol essentia::init found in Essentia_iOS.a."
else
  echo "Warning: Symbol essentia::init not found in Essentia_iOS.a. The build may be incomplete."
fi

echo "Essentia build for iOS completed successfully!"