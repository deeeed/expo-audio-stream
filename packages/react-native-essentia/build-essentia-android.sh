#!/bin/bash
set -e

# Define supported architectures
SUPPORTED_ARCHS=("arm64-v8a" "armeabi-v7a" "x86" "x86_64")

# Display usage information
function show_usage {
  echo "Usage: $0 [OPTIONS]"
  echo "Build Essentia library for Android."
  echo ""
  echo "Options:"
  echo "  --arch=ARCH      Build for specific architecture (${SUPPORTED_ARCHS[*]})"
  echo "  --all            Build for all supported architectures"
  echo "  --force          Force rebuild even if library exists"
  echo "  --help           Show this help message"
  echo ""
  echo "Example: $0 --arch=arm64-v8a"
  echo "Example: $0 --all"
}

# Check if Essentia repository exists
if [ ! -d "third_party/essentia" ]; then
  echo "Error: Essentia source not found. Please run ./setup.sh first."
  exit 1
fi

FORCE_BUILD=false
BUILD_ALL=false
SELECTED_ARCH=""

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --arch=*)
      SELECTED_ARCH="${arg#*=}"
      ;;
    --all)
      BUILD_ALL=true
      ;;
    --force)
      FORCE_BUILD=true
      ;;
    --help)
      show_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $arg"
      show_usage
      exit 1
      ;;
  esac
done

# Validate architecture if specified
if [ -n "$SELECTED_ARCH" ] && [[ ! " ${SUPPORTED_ARCHS[*]} " =~ " ${SELECTED_ARCH} " ]]; then
  echo "Error: Unsupported architecture '$SELECTED_ARCH'"
  echo "Supported architectures: ${SUPPORTED_ARCHS[*]}"
  exit 1
fi

# Determine which architectures to build
if [ "$BUILD_ALL" = true ]; then
  ARCHS_TO_BUILD=("${SUPPORTED_ARCHS[@]}")
elif [ -n "$SELECTED_ARCH" ]; then
  ARCHS_TO_BUILD=("$SELECTED_ARCH")
else
  # Default to arm64-v8a if no architecture specified
  ARCHS_TO_BUILD=("arm64-v8a")
  echo "No architecture specified, defaulting to arm64-v8a"
  echo "Use --arch=ARCH to specify an architecture or --all for all architectures"
fi

# Build for each selected architecture
for ARCH in "${ARCHS_TO_BUILD[@]}"; do
  echo "====== Building for $ARCH ======"

  # Create output directory
  mkdir -p android/src/main/jniLibs/${ARCH}

  # Check if library already exists and skip build if no changes
  if [ -f "android/src/main/jniLibs/${ARCH}/libessentia.a" ] && [ "$FORCE_BUILD" = false ]; then
    echo "Library for ${ARCH} already exists. Use --force to rebuild."
    continue
  fi

  # Set Android build environment variables
  export API_LEVEL=21
  case $ARCH in
    "arm64-v8a")
      export TARGET=aarch64-linux-android
      ;;
    "armeabi-v7a")
      export TARGET=armv7a-linux-androideabi
      ;;
    "x86")
      export TARGET=i686-linux-android
      ;;
    "x86_64")
      export TARGET=x86_64-linux-android
      ;;
  esac

  # Set compiler variables
  export CC=$TOOLCHAIN/bin/${TARGET}${API_LEVEL}-clang
  export CXX=$TOOLCHAIN/bin/${TARGET}${API_LEVEL}-clang++
  export AR=$TOOLCHAIN/bin/llvm-ar
  export RANLIB=$TOOLCHAIN/bin/llvm-ranlib
  export STRIP=$TOOLCHAIN/bin/llvm-strip

  # Include paths
  export SYSROOT=$TOOLCHAIN/sysroot
  export CFLAGS="--sysroot=$SYSROOT"
  export CXXFLAGS="$CFLAGS"
  export LDFLAGS="--sysroot=$SYSROOT"

  # Set the environment variable for the build process
  export ANDROID_ABI=${ARCH}

  cd third_party/essentia

  echo "Configuring Essentia for Android (${ARCH})..."
  python3 waf configure --cross-compile-android --lightweight= --fft=KISS --build-static

  echo "Building Essentia..."
  python3 waf

  echo "Copying library for Android..."
  find build -name "libessentia*.a" -exec cp {} ../../android/src/main/jniLibs/${ARCH}/ \;

  cd ../../

  echo "Essentia build for Android (${ARCH}) complete!"
done

echo "All requested builds completed successfully!"
