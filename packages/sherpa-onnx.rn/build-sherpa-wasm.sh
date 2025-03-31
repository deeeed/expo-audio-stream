#!/bin/bash

# build-sherpa-wasm.sh
# Build Sherpa-onnx for WebAssembly (WASM) using existing build scripts

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
FORCE_REBUILD=false
BUILD_TYPE="all"  # default to building all modules

for arg in "$@"; do
  case $arg in
    -f|--force)
      FORCE_REBUILD=true
      shift
      ;;
    --tts)
      BUILD_TYPE="tts"
      shift
      ;;
    --asr)
      BUILD_TYPE="asr"
      shift
      ;;
    --vad)
      BUILD_TYPE="vad"
      shift
      ;;
    --vad-asr)
      BUILD_TYPE="vad-asr"
      shift
      ;;
    --kws)
      BUILD_TYPE="kws"
      shift
      ;;
    --speaker-diarization)
      BUILD_TYPE="speaker-diarization"
      shift
      ;;
    --speech-enhancement)
      BUILD_TYPE="speech-enhancement"
      shift
      ;;
    --nodejs)
      BUILD_TYPE="nodejs"
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  -f, --force              Force rebuild even if files exist"
      echo "  --tts                    Build only TTS module"
      echo "  --asr                    Build only ASR module"
      echo "  --vad                    Build only VAD module"
      echo "  --vad-asr                Build only VAD+ASR module"
      echo "  --kws                    Build only KWS module"
      echo "  --speaker-diarization    Build only Speaker Diarization module"
      echo "  --speech-enhancement     Build only Speech Enhancement module"
      echo "  --nodejs                 Build only NodeJS module"
      echo "  --all                    Build all modules separately (default)"
      echo "  --help                   Show this help message"
      exit 0
      ;;
    --all)
      BUILD_TYPE="all"
      shift
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if sherpa-onnx is cloned
if [ ! -d "third_party/sherpa-onnx" ]; then
  echo -e "${RED}Error: sherpa-onnx repository not found. Run ./setup.sh first.${NC}"
  exit 1
fi

# Check if libraries already exist and we're not forcing a rebuild
if [ "$FORCE_REBUILD" = false ] && [ -d "prebuilt/web" ] && [ "$(ls -A prebuilt/web/*.js 2>/dev/null)" ]; then
  echo -e "${GREEN}WASM build artifacts already exist. Skipping rebuild.${NC}"
  echo -e "${YELLOW}Use -f or --force to rebuild anyway.${NC}"
  exit 0
fi

# Check if Emscripten is installed
if ! command -v emcc &> /dev/null; then
  echo -e "${RED}Error: Emscripten compiler (emcc) not found.${NC}"
  echo -e "${YELLOW}Please install Emscripten first:${NC}"
  echo -e "git clone https://github.com/emscripten-core/emsdk.git"
  echo -e "cd emsdk"
  echo -e "./emsdk install 3.1.53"
  echo -e "./emsdk activate 3.1.53"
  echo -e "source ./emsdk_env.sh"
  exit 1
fi

# Create necessary directories
mkdir -p prebuilt/web
mkdir -p ../apps/sherpa-onnx-demo/public/wasm

# Function to check if prerequisites are met for a module
check_prerequisites() {
  local module_name=$1
  
  if [[ "$module_name" == "tts" ]]; then
    # Check for TTS prerequisites
    local readme_path="$SCRIPT_DIR/third_party/sherpa-onnx/wasm/tts/assets/README.md"
    
    if [ -f "$readme_path" ]; then
      echo -e "${YELLOW}TTS module requires prerequisites.${NC}"
      echo -e "${YELLOW}Please read $readme_path${NC}"
      echo -e "${YELLOW}and follow the instructions to prepare the TTS assets before continuing.${NC}"
      
      # Check if the assets directory is empty
      local assets_dir="$SCRIPT_DIR/third_party/sherpa-onnx/wasm/tts/assets"
      if [ -d "$assets_dir" ] && [ -z "$(ls -A $assets_dir/*.onnx 2>/dev/null)" ]; then
        echo -e "${RED}No ONNX model files found in $assets_dir${NC}"
        echo -e "${RED}Please download the required model files as described in the README.${NC}"
        return 1
      fi
    fi
  fi
  
  return 0
}

# Function to build a specific module
build_module() {
  local module_name=$1
  local build_script="build-wasm-simd-${module_name}.sh"
  
  echo -e "${BLUE}Building ${module_name} WASM module...${NC}"
  cd "$SCRIPT_DIR/third_party/sherpa-onnx"
  
  # Check if build script exists
  if [ ! -f "$build_script" ]; then
    echo -e "${RED}Error: Build script $build_script not found.${NC}"
    return 1
  fi
  
  # Check prerequisites
  if ! check_prerequisites "$module_name"; then
    echo -e "${RED}Prerequisites for ${module_name} module not met. Skipping build.${NC}"
    return 1
  fi
  
  # Make the script executable and run it
  chmod +x "$build_script"
  set +e  # Temporarily disable exit on error
  ./"$build_script"
  local build_result=$?
  set -e  # Re-enable exit on error
  
  if [ $build_result -ne 0 ]; then
    echo -e "${RED}Build failed for ${module_name} module.${NC}"
    if [[ "$module_name" == "tts" ]]; then
      echo -e "${YELLOW}Note: TTS module requires specific assets to be downloaded first.${NC}"
      echo -e "${YELLOW}Please read $SCRIPT_DIR/third_party/sherpa-onnx/wasm/tts/assets/README.md${NC}"
    fi
    return 1
  fi
  
  # Detect the output directory based on the module name
  local output_dir="build-wasm-simd-${module_name}"
  if [ ! -d "$output_dir" ]; then
    echo -e "${YELLOW}Warning: Output directory $output_dir not found.${NC}"
    return 1
  fi
  
  # Copy files to prebuilt directory only
  echo -e "${GREEN}${module_name} build completed. Copying files...${NC}"
  mkdir -p "$SCRIPT_DIR/prebuilt/web/${module_name}"
  
  if [ -d "${output_dir}/install/bin/wasm/${module_name}" ]; then
    cp -r "${output_dir}/install/bin/wasm/${module_name}"/* "$SCRIPT_DIR/prebuilt/web/${module_name}/"
    
    # Store the build output path for later use in validation instructions
    export ${module_name}_build_path="${PWD}/${output_dir}/install/bin/wasm/${module_name}"
  else
    echo -e "${YELLOW}Warning: No build output found in ${output_dir}/install/bin/wasm/${module_name}${NC}"
    return 1
  fi
  
  cd "$SCRIPT_DIR"
  return 0
}

# Track overall build success
OVERALL_SUCCESS=true
SUCCESSFUL_MODULES=()
FAILED_MODULES=()

# Build individual modules
if [ "$BUILD_TYPE" = "all" ] || [ "$BUILD_TYPE" = "tts" ]; then
  if build_module "tts"; then
    SUCCESSFUL_MODULES+=("tts")
  else
    FAILED_MODULES+=("tts")
    OVERALL_SUCCESS=false
  fi
fi

if [ "$BUILD_TYPE" = "all" ] || [ "$BUILD_TYPE" = "asr" ]; then
  if build_module "asr"; then
    SUCCESSFUL_MODULES+=("asr")
  else
    FAILED_MODULES+=("asr")
    OVERALL_SUCCESS=false
  fi
fi

if [ "$BUILD_TYPE" = "all" ] || [ "$BUILD_TYPE" = "vad" ]; then
  if build_module "vad"; then
    SUCCESSFUL_MODULES+=("vad")
  else
    FAILED_MODULES+=("vad")
    OVERALL_SUCCESS=false
  fi
fi

if [ "$BUILD_TYPE" = "all" ] || [ "$BUILD_TYPE" = "vad-asr" ]; then
  if build_module "vad-asr"; then
    SUCCESSFUL_MODULES+=("vad-asr")
  else
    FAILED_MODULES+=("vad-asr")
    OVERALL_SUCCESS=false
  fi
fi

if [ "$BUILD_TYPE" = "all" ] || [ "$BUILD_TYPE" = "kws" ]; then
  if build_module "kws"; then
    SUCCESSFUL_MODULES+=("kws")
  else
    FAILED_MODULES+=("kws")
    OVERALL_SUCCESS=false
  fi
fi

if [ "$BUILD_TYPE" = "all" ] || [ "$BUILD_TYPE" = "speaker-diarization" ]; then
  if build_module "speaker-diarization"; then
    SUCCESSFUL_MODULES+=("speaker-diarization")
  else
    FAILED_MODULES+=("speaker-diarization")
    OVERALL_SUCCESS=false
  fi
fi

if [ "$BUILD_TYPE" = "all" ] || [ "$BUILD_TYPE" = "speech-enhancement" ]; then
  if build_module "speech-enhancement"; then
    SUCCESSFUL_MODULES+=("speech-enhancement")
  else
    FAILED_MODULES+=("speech-enhancement")
    OVERALL_SUCCESS=false
  fi
fi

if [ "$BUILD_TYPE" = "all" ] || [ "$BUILD_TYPE" = "nodejs" ]; then
  if build_module "nodejs"; then
    SUCCESSFUL_MODULES+=("nodejs")
  else
    FAILED_MODULES+=("nodejs")
    OVERALL_SUCCESS=false
  fi
fi

# Display build results
echo -e "\n${BLUE}=== Build Summary ===${NC}"

if [ ${#SUCCESSFUL_MODULES[@]} -ne 0 ]; then
  echo -e "${GREEN}Successfully built modules:${NC}"
  for module in "${SUCCESSFUL_MODULES[@]}"; do
    echo -e "  - ${GREEN}$module${NC}"
  done
fi

if [ ${#FAILED_MODULES[@]} -ne 0 ]; then
  echo -e "${RED}Failed to build modules:${NC}"
  for module in "${FAILED_MODULES[@]}"; do
    echo -e "  - ${RED}$module${NC}"
  done
  
  echo -e "\n${YELLOW}For TTS module, ensure you've downloaded the required model files:${NC}"
  echo -e "${YELLOW}Read: $SCRIPT_DIR/third_party/sherpa-onnx/wasm/tts/assets/README.md${NC}"
fi

if $OVERALL_SUCCESS; then
  echo -e "\n${GREEN}WASM build process completed successfully!${NC}"
else
  echo -e "\n${YELLOW}WASM build completed with some modules failing.${NC}"
  echo -e "${YELLOW}You can still use the successfully built modules.${NC}"
fi

echo -e "\n${BLUE}WASM files are available in:${NC}"
echo -e "${YELLOW}- $SCRIPT_DIR/prebuilt/web/${NC}"

# Display validation instructions for each successful module
echo -e "\n${BLUE}=== How to Validate Built Modules ===${NC}"

for module in "${SUCCESSFUL_MODULES[@]}"; do
  echo -e "\n${GREEN}To validate the ${module} module:${NC}"
  
  # Get the build path using variable reference
  build_path_var="${module}_build_path"
  build_path="${!build_path_var}"
  
  echo -e "${YELLOW}cd \"$build_path\"${NC}"
  echo -e "${YELLOW}python -m http.server 8000${NC}"
  echo -e "${YELLOW}# Then open http://localhost:8000 in your browser${NC}"
  
  if [[ "$module" == "tts" ]]; then
    echo -e "\n${BLUE}For integration in React Native Web:${NC}"
    echo -e "${YELLOW}1. Copy files from $build_path to your public directory${NC}"
    echo -e "${YELLOW}   mkdir -p $SCRIPT_DIR/../apps/sherpa-onnx-demo/public/wasm/${module}"
    echo -e "${YELLOW}   cp -r \"$build_path\"/* $SCRIPT_DIR/../apps/sherpa-onnx-demo/public/wasm/${module}/"
    echo -e "${YELLOW}2. Import the module in your code:${NC}"
    echo -e "${YELLOW}   const SherpaOnnxTts = await import('/wasm/tts/sherpa-onnx-tts.js');${NC}"
    echo -e "${YELLOW}3. Initialize with: const tts = await SherpaOnnxTts.default.create({});${NC}"
  fi
done

# Fix the exit code issue - convert boolean to numeric
if $OVERALL_SUCCESS; then
  exit 0
else
  exit 1
fi 