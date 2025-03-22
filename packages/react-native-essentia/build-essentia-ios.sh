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
if [ -f "ios/Frameworks/device/Essentia_iOS.a" ] && [ -f "ios/Frameworks/simulator/Essentia_Sim_x86_64.a" ] && [ -f "ios/Frameworks/simulator/Essentia_Sim_arm64.a" ] && [ "$1" != "--force" ]; then
  echo "iOS libraries already exist. Use --force to rebuild."
  exit 0
fi

cd third_party/essentia

# Clean any previous builds
echo "Cleaning previous builds..."
python3 waf distclean
find . -name "*.o" -delete
find . -name "*.a" -delete
rm -rf build

# FIRST: Build for iOS simulator x86_64
echo "Configuring Essentia for iOS simulator (x86_64)..."
# Reset environment variables
unset CFLAGS CXXFLAGS LDFLAGS CPPFLAGS

# Set simulator SDK path explicitly
SIMULATOR_SDK_PATH=$(xcrun --sdk iphonesimulator --show-sdk-path)
echo "Using simulator SDK path: $SIMULATOR_SDK_PATH"

# Set explicit environment variables for x86_64 simulator build
# Updated to use iOS 15.0 minimum version
export CFLAGS="-arch x86_64 -isysroot $SIMULATOR_SDK_PATH -miphoneos-version-min=15.0 -mios-simulator-version-min=15.0"
export CXXFLAGS="-arch x86_64 -isysroot $SIMULATOR_SDK_PATH -miphoneos-version-min=15.0 -mios-simulator-version-min=15.0"
export LDFLAGS="-arch x86_64 -isysroot $SIMULATOR_SDK_PATH -miphoneos-version-min=15.0 -mios-simulator-version-min=15.0"
export SDKROOT="$SIMULATOR_SDK_PATH"

# Configure for x86_64 simulator
python3 waf configure --cross-compile-ios-sim-x86_64 --lightweight= --fft=ACCELERATE --build-static
if [ $? -ne 0 ]; then
  echo "Error: Configuration for iOS simulator x86_64 failed. Check waf logs."
  exit 1
fi

echo "Building Essentia for iOS simulator (x86_64)..."
python3 waf --verbose
if [ $? -ne 0 ]; then
  echo "Error: Build for iOS simulator x86_64 failed. Check waf logs."
  exit 1
fi

echo "Copying library for iOS simulator (x86_64)..."
mkdir -p ../../ios/Frameworks/simulator/
cp build/src/libessentia.a ../../ios/Frameworks/simulator/Essentia_Sim_x86_64.a

# Clean for second build
echo "Cleaning for simulator arm64 build..."
python3 waf distclean
find . -name "*.o" -delete
find . -name "*.a" -delete
rm -rf build

# SECOND: Build for iOS simulator arm64
echo "Configuring Essentia for iOS simulator (arm64)..."
unset CFLAGS CXXFLAGS LDFLAGS CPPFLAGS SDKROOT

# Set simulator SDK path for arm64
SIMULATOR_SDK_PATH=$(xcrun --sdk iphonesimulator --show-sdk-path)
echo "Using simulator SDK path: $SIMULATOR_SDK_PATH"

# Set environment variables for arm64 simulator - Updated to iOS 15.0
export CFLAGS="-arch arm64 -isysroot $SIMULATOR_SDK_PATH -miphoneos-version-min=15.0 -mios-simulator-version-min=15.0 -target arm64-apple-ios15.0-simulator"
export CXXFLAGS="-arch arm64 -isysroot $SIMULATOR_SDK_PATH -miphoneos-version-min=15.0 -mios-simulator-version-min=15.0 -target arm64-apple-ios15.0-simulator"
export LDFLAGS="-arch arm64 -isysroot $SIMULATOR_SDK_PATH -miphoneos-version-min=15.0 -mios-simulator-version-min=15.0 -target arm64-apple-ios15.0-simulator"
export SDKROOT="$SIMULATOR_SDK_PATH"

python3 waf configure --cross-compile-ios-sim-arm64 --lightweight= --fft=ACCELERATE --build-static
if [ $? -ne 0 ]; then
  echo "Error: Configuration for iOS simulator arm64 failed. Check waf logs."
  exit 1
fi

echo "Building Essentia for iOS simulator (arm64)..."
python3 waf --verbose
if [ $? -ne 0 ]; then
  echo "Error: Build for iOS simulator arm64 failed. Check waf logs."
  exit 1
fi

echo "Copying library for iOS simulator (arm64)..."
cp build/src/libessentia.a ../../ios/Frameworks/simulator/Essentia_Sim_arm64.a

# LASTLY: Build for iOS devices
echo "Cleaning for device build..."
python3 waf distclean
find . -name "*.o" -delete
find . -name "*.a" -delete
rm -rf build

echo "Configuring Essentia for iOS devices..."
# Reset and set proper device environment
unset CFLAGS CXXFLAGS LDFLAGS CPPFLAGS SDKROOT
DEVICE_SDK_PATH=$(xcrun --sdk iphoneos --show-sdk-path)
echo "Using device SDK path: $DEVICE_SDK_PATH"

# Updated to use iOS 15.0 minimum version
export CFLAGS="-arch arm64 -isysroot $DEVICE_SDK_PATH -miphoneos-version-min=15.0"
export CXXFLAGS="-arch arm64 -isysroot $DEVICE_SDK_PATH -miphoneos-version-min=15.0"
export LDFLAGS="-arch arm64 -isysroot $DEVICE_SDK_PATH -miphoneos-version-min=15.0"
export SDKROOT="$DEVICE_SDK_PATH"

python3 waf configure --cross-compile-ios --lightweight= --fft=ACCELERATE --build-static
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
mkdir -p ../../ios/Frameworks/device/
cp build/src/libessentia.a ../../ios/Frameworks/device/Essentia_iOS.a

# Verify architecture of individual libraries
echo "Verifying library architectures..."
cd ../..
echo "iOS device library (arm64):"
lipo -info ios/Frameworks/device/Essentia_iOS.a

echo "Simulator x86_64 library:"
lipo -info ios/Frameworks/simulator/Essentia_Sim_x86_64.a

echo "Simulator arm64 library:"
lipo -info ios/Frameworks/simulator/Essentia_Sim_arm64.a

# Create a combined simulator library
echo "Creating combined simulator library..."
lipo -create ios/Frameworks/simulator/Essentia_Sim_x86_64.a ios/Frameworks/simulator/Essentia_Sim_arm64.a -output ios/Frameworks/simulator/Essentia_Sim.a
echo "Combined simulator library:"
lipo -info ios/Frameworks/simulator/Essentia_Sim.a

# Create a symbolic link for initial use - will be updated during build
echo "Creating initial symlink to device library..."
ln -sf ios/Frameworks/device/Essentia_iOS.a ios/Frameworks/libEssentiaPrebuilt.a

# Verifying symbols in the device library
echo "Verifying symbols in Essentia_iOS.a..."
if nm -gU ios/Frameworks/device/Essentia_iOS.a | grep -q "_ZN8essentia4initEv"; then
  echo "✓ Success: Symbol essentia::init found in Essentia_iOS.a."
else
  echo "⚠️ Warning: Symbol essentia::init not found in Essentia_iOS.a. The build may be incomplete."
fi

echo "Essentia build for iOS completed successfully!"