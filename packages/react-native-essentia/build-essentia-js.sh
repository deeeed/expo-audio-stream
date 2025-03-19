#!/bin/bash
set -e

# Display usage information
function show_usage {
  echo "Usage: $0 [OPTIONS]"
  echo "Build Essentia.js WASM module."
  echo ""
  echo "Options:"
  echo "  --force    Force rebuild even if WASM exists"
  echo "  --help     Show this help message"
  echo ""
}

# Check if Essentia and Essentia.js repositories exist
if [ ! -d "third_party/essentia" ]; then
  echo "Error: Essentia source not found. Please run ./setup.sh first."
  exit 1
fi

if [ ! -d "third_party/essentia.js" ]; then
  echo "Error: Essentia.js source not found. Please run ./setup.sh first."
  exit 1
fi

# Check if emscripten is installed
if ! command -v emcc &> /dev/null; then
  echo "Error: Emscripten is not installed or not in PATH."
  echo "Please install emscripten to build custom WASM modules."
  echo "Visit https://emscripten.org/docs/getting_started/downloads.html for installation instructions."
  exit 1
else
  EMSCRIPTEN_VERSION=$(emcc --version | head -n 1)
  echo "Using Emscripten: $EMSCRIPTEN_VERSION"
fi

FORCE_BUILD=false
OUTPUT_DIR="dist"

# Parse command line arguments
for arg in "$@"; do
  case $arg in
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

# Create output directory
mkdir -p $OUTPUT_DIR

# Check if WASM module already exists and skip build if not forcing
if [ -f "$OUTPUT_DIR/essentia-wasm.js" ] && [ -f "$OUTPUT_DIR/essentia-wasm.wasm" ] && [ "$FORCE_BUILD" = false ]; then
  echo "Essentia.js WASM module already exists. Use --force to rebuild."
  exit 0
fi

echo "====== Building Essentia.js WASM module ======"

# First, build Essentia with emscripten if not already built
if [ ! -f "$EMSCRIPTEN/system/local/lib/libessentia.a" ] || [ "$FORCE_BUILD" = true ]; then
  echo "Building Essentia with Emscripten..."

  cd third_party/essentia

  # Clean any previous builds
  python3 waf distclean

  # Configure build settings for essentia using kissfft
  emconfigure sh -c './waf configure --prefix=$EMSCRIPTEN/system/local/ --build-static --lightweight= --fft=KISS --emscripten'

  # Compile and build essentia
  emmake ./waf

  # Install essentia
  emmake ./waf install

  cd ../../

  echo "Essentia built with Emscripten successfully!"
else
  echo "Using existing Essentia Emscripten build."
fi

# Configure essentia.js bindings with default algorithm list
echo "Configuring essentia.js bindings with default algorithm list..."
cd third_party/essentia.js/src/python
python configure_bindings.py
cd ../../../..

# Build the essentia.js bindings
echo "Building essentia.js WASM module..."
cd third_party/essentia.js
emconfigure sh -c './build-bindings.sh Makefile.essentiajs'

# Copy the built files to our project's output directory
echo "Copying built files to $OUTPUT_DIR..."
cp -r dist/* ../../$OUTPUT_DIR/

# Return to the project root
cd ../../

echo "Essentia.js WASM module build complete!"
echo "WASM module and JavaScript wrapper available in the '$OUTPUT_DIR' directory."