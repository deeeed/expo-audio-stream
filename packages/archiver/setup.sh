#!/bin/bash

# setup.sh
# Setup script for @siteed/archiver native dependencies

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up @siteed/archiver native dependencies...${NC}"

# Check if necessary tools are installed
command -v git >/dev/null 2>&1 || { echo -e "${RED}Error: git is not installed.${NC}" >&2; exit 1; }
command -v cmake >/dev/null 2>&1 || { echo -e "${RED}Error: cmake is not installed.${NC}" >&2; exit 1; }
command -v make >/dev/null 2>&1 || { echo -e "${RED}Error: make is not installed.${NC}" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Create directories if they don't exist
mkdir -p third_party
mkdir -p prebuilt/ios
mkdir -p ios/Frameworks

# libarchive version
LIBARCHIVE_VERSION="3.7.8"

# Download or update libarchive repository
echo -e "${BLUE}Updating libarchive repository to v${LIBARCHIVE_VERSION}...${NC}"

# Check if the libarchive directory already exists and is empty or needs to be updated
if [ ! -d "$SCRIPT_DIR/third_party/libarchive" ] || [ -z "$(ls -A $SCRIPT_DIR/third_party/libarchive 2>/dev/null | grep -v '.gitkeep')" ]; then
  # Directory doesn't exist or is empty, clone the repository
  mkdir -p "$SCRIPT_DIR/third_party"
  rm -rf "$SCRIPT_DIR/third_party/libarchive"
  mkdir -p "$SCRIPT_DIR/third_party/libarchive"
  git clone --depth 1 --branch "v$LIBARCHIVE_VERSION" https://github.com/libarchive/libarchive.git "$SCRIPT_DIR/third_party/libarchive"

  # Remove .git directory to prevent embedding a git repository
  rm -rf "$SCRIPT_DIR/third_party/libarchive/.git"
else
  # Directory exists and has content, checkout the right version
  cd "$SCRIPT_DIR/third_party/libarchive"
  git checkout "v$LIBARCHIVE_VERSION"
  cd "$SCRIPT_DIR"

  # Remove .git directory to prevent embedding a git repository
  rm -rf "$SCRIPT_DIR/third_party/libarchive/.git"
fi

# Install node dependencies
echo -e "${BLUE}Installing node dependencies...${NC}"
yarn install

# Build libarchive for iOS (if on macOS)
if [ "$(uname)" == "Darwin" ]; then  # Only on macOS
  echo -e "${BLUE}Building libarchive for iOS...${NC}"

  # Check for XCode
  command -v xcodebuild >/dev/null 2>&1 || { echo -e "${YELLOW}Warning: xcodebuild not found. Skipping iOS build.${NC}" >&2; }

  if command -v xcodebuild >/dev/null 2>&1; then
    # iOS architectures and platforms
    ARCHS=("arm64" "x86_64")
    PLATFORMS=("iphoneos" "iphonesimulator")

    # Build directory
    BUILD_DIR="$SCRIPT_DIR/build/ios"
    mkdir -p "$BUILD_DIR"

    # Output directory for final libraries
    OUTPUT_DIR="$SCRIPT_DIR/prebuilt/ios"
    mkdir -p "$OUTPUT_DIR"

    # Clean previous builds
    rm -rf "$BUILD_DIR"/*
    rm -rf "$OUTPUT_DIR"/*

    # Build for each architecture and platform
    for ARCH in "${ARCHS[@]}"; do
      for PLATFORM in "${PLATFORMS[@]}"; do
        # Skip invalid combinations
        if [ "$ARCH" = "arm64" ] && [ "$PLATFORM" = "iphonesimulator" ]; then
          continue
        fi
        if [ "$ARCH" = "x86_64" ] && [ "$PLATFORM" = "iphoneos" ]; then
          continue
        fi

        echo -e "${YELLOW}Building for $PLATFORM - $ARCH...${NC}"

        # Get SDK path
        SDK_PATH=$(xcrun --sdk $PLATFORM --show-sdk-path)

        # Create platform-specific build directory
        PLATFORM_BUILD_DIR="$BUILD_DIR/$PLATFORM-$ARCH"
        mkdir -p "$PLATFORM_BUILD_DIR"

        # Configure with CMake
        cd "$PLATFORM_BUILD_DIR"

        if [ "$PLATFORM" = "iphoneos" ]; then
          # iOS device
          cmake "$SCRIPT_DIR/third_party/libarchive" \
            -DCMAKE_SYSTEM_NAME=iOS \
            -DCMAKE_OSX_ARCHITECTURES=$ARCH \
            -DCMAKE_OSX_DEPLOYMENT_TARGET=11.0 \
            -DCMAKE_INSTALL_PREFIX="$PLATFORM_BUILD_DIR/install" \
            -DCMAKE_XCODE_ATTRIBUTE_ONLY_ACTIVE_ARCH=NO \
            -DCMAKE_IOS_INSTALL_COMBINED=YES \
            -DBUILD_SHARED_LIBS=OFF \
            -DENABLE_TEST=OFF \
            -DENABLE_OPENSSL=OFF \
            -DENABLE_LZ4=OFF \
            -DENABLE_LZMA=OFF \
            -DENABLE_ZSTD=OFF \
            -DENABLE_ZLIB=OFF \
            -DENABLE_CAT=OFF \
            -DENABLE_TAR=OFF \
            -DENABLE_CPIO=OFF \
            -DENABLE_UNZIP=OFF \
            -DCMAKE_POSITION_INDEPENDENT_CODE=ON \
            -DCMAKE_OSX_SYSROOT=$SDK_PATH
        else
          # iOS simulator
          cmake "$SCRIPT_DIR/third_party/libarchive" \
            -DCMAKE_SYSTEM_NAME=iOS \
            -DCMAKE_OSX_ARCHITECTURES=$ARCH \
            -DCMAKE_OSX_DEPLOYMENT_TARGET=11.0 \
            -DCMAKE_INSTALL_PREFIX="$PLATFORM_BUILD_DIR/install" \
            -DCMAKE_XCODE_ATTRIBUTE_ONLY_ACTIVE_ARCH=NO \
            -DCMAKE_IOS_INSTALL_COMBINED=YES \
            -DBUILD_SHARED_LIBS=OFF \
            -DENABLE_TEST=OFF \
            -DENABLE_OPENSSL=OFF \
            -DENABLE_LZ4=OFF \
            -DENABLE_LZMA=OFF \
            -DENABLE_ZSTD=OFF \
            -DENABLE_ZLIB=OFF \
            -DENABLE_CAT=OFF \
            -DENABLE_TAR=OFF \
            -DENABLE_CPIO=OFF \
            -DENABLE_UNZIP=OFF \
            -DCMAKE_POSITION_INDEPENDENT_CODE=ON \
            -DCMAKE_OSX_SYSROOT=$SDK_PATH
        fi

        # Build
        cmake --build . --config Release
        cmake --install . --config Release

        # Keep track of the built libraries for later creating fat libraries
        mkdir -p "$OUTPUT_DIR/$PLATFORM-$ARCH"
        cp -r "$PLATFORM_BUILD_DIR/install/lib" "$OUTPUT_DIR/$PLATFORM-$ARCH/"
        cp -r "$PLATFORM_BUILD_DIR/install/include" "$OUTPUT_DIR/$PLATFORM-$ARCH/"
      done
    done

    # Create fat libraries for device
    if [ -d "$OUTPUT_DIR/iphoneos-arm64/lib" ]; then
      mkdir -p "$OUTPUT_DIR/iphoneos/lib"
      mkdir -p "$OUTPUT_DIR/iphoneos/include"

      cp -r "$OUTPUT_DIR/iphoneos-arm64/include/"* "$OUTPUT_DIR/iphoneos/include/"

      # Use lipo to create fat libraries
      echo -e "${YELLOW}Creating fat libraries for iphoneos...${NC}"
      for LIB in "$OUTPUT_DIR/iphoneos-arm64/lib/"*.a; do
        LIBNAME=$(basename "$LIB")
        lipo -create "$OUTPUT_DIR/iphoneos-arm64/lib/$LIBNAME" -output "$OUTPUT_DIR/iphoneos/lib/$LIBNAME"
      done
    fi

    # Create fat libraries for simulator
    if [ -d "$OUTPUT_DIR/iphonesimulator-x86_64/lib" ]; then
      mkdir -p "$OUTPUT_DIR/iphonesimulator/lib"
      mkdir -p "$OUTPUT_DIR/iphonesimulator/include"

      cp -r "$OUTPUT_DIR/iphonesimulator-x86_64/include/"* "$OUTPUT_DIR/iphonesimulator/include/"

      # Use lipo to create fat libraries
      echo -e "${YELLOW}Creating fat libraries for iphonesimulator...${NC}"
      for LIB in "$OUTPUT_DIR/iphonesimulator-x86_64/lib/"*.a; do
        LIBNAME=$(basename "$LIB")
        lipo -create "$OUTPUT_DIR/iphonesimulator-x86_64/lib/$LIBNAME" -output "$OUTPUT_DIR/iphonesimulator/lib/$LIBNAME"
      done
    fi

    # Create XCFramework
    echo -e "${YELLOW}Creating XCFramework...${NC}"
    mkdir -p "$OUTPUT_DIR/xcframework"

    # Create XCFramework for libarchive
    xcrun xcodebuild -create-xcframework \
      -library "$OUTPUT_DIR/iphoneos/lib/libarchive.a" \
      -headers "$OUTPUT_DIR/iphoneos/include" \
      -library "$OUTPUT_DIR/iphonesimulator/lib/libarchive.a" \
      -headers "$OUTPUT_DIR/iphonesimulator/include" \
      -output "$OUTPUT_DIR/xcframework/LibArchive.xcframework"

    # Copy the XCFramework to the iOS directory for easy integration
    mkdir -p "$SCRIPT_DIR/ios/Frameworks"
    cp -r "$OUTPUT_DIR/xcframework/LibArchive.xcframework" "$SCRIPT_DIR/ios/Frameworks/"

    echo -e "${GREEN}Successfully built libarchive for iOS!${NC}"
    echo -e "${BLUE}XCFramework is available at: $SCRIPT_DIR/ios/Frameworks/LibArchive.xcframework${NC}"
  fi
else
  echo -e "${YELLOW}Skipping iOS build (not on macOS)${NC}"
fi

# Setup example project
echo -e "${BLUE}Setting up example project...${NC}"
cd example
yarn install
cd "$SCRIPT_DIR"

# Build the TypeScript code
echo -e "${YELLOW}Building TypeScript...${NC}"
yarn clean
yarn typecheck
yarn prepare

echo -e "${GREEN}Setup completed successfully!${NC}"
echo -e "${BLUE}You can now run the example app:${NC}"
echo -e "${YELLOW}  cd example && yarn prebuild && yarn android${NC}"
echo -e "${YELLOW}  cd example && yarn prebuild && yarn ios${NC}"
