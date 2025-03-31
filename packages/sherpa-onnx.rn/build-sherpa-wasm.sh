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
    --combined)
      BUILD_TYPE="combined"
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
      echo "  --combined               Build a unified module with all capabilities"
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
mkdir -p wasm/combined
mkdir -p ../apps/sherpa-onnx-demo/public/wasm

# Function to check if prerequisites are met for a module
check_prerequisites() {
  local module_name=$1
  
  if [[ "$module_name" == "tts" ]] || [[ "$module_name" == "combined" ]]; then
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

# Function to build the combined module
build_combined_module() {
  echo -e "${BLUE}Building combined WASM module with all capabilities...${NC}"
  
  # Check prerequisites for all relevant modules
  if ! check_prerequisites "combined"; then
    echo -e "${RED}Prerequisites for combined module not met. Skipping build.${NC}"
    return 1
  fi
  
  # Create combined module directory
  mkdir -p "$SCRIPT_DIR/wasm/combined"
  
  # Create combined CMakeLists.txt by copying from template
  if [ ! -f "$SCRIPT_DIR/wasm/combined/CMakeLists.txt" ]; then
    echo -e "${YELLOW}Creating custom CMakeLists.txt for combined module...${NC}"
    
    # Copy the CMakeLists.txt template
    cat > "$SCRIPT_DIR/wasm/combined/CMakeLists.txt" << 'EOF'
if(NOT $ENV{SHERPA_ONNX_IS_USING_BUILD_WASM_SH})
  message(FATAL_ERROR "Please use ./build-wasm-simd-combined.sh to build for wasm combined module")
endif()

# Check if TTS assets are available
if(NOT EXISTS "${CMAKE_SOURCE_DIR}/wasm/tts/assets/model.onnx")
  message(FATAL_ERROR "Please read ${CMAKE_SOURCE_DIR}/wasm/tts/assets/README.md before you continue")
endif()

# Define exported functions for all modules
set(exported_functions
  # Common functions
  MyPrint
  CopyHeap
  SherpaOnnxFileExists
  
  # TTS functions
  SherpaOnnxCreateOfflineTts
  SherpaOnnxDestroyOfflineTts
  SherpaOnnxDestroyOfflineTtsGeneratedAudio
  SherpaOnnxOfflineTtsGenerate
  SherpaOnnxOfflineTtsGenerateWithCallback
  SherpaOnnxOfflineTtsNumSpeakers
  SherpaOnnxOfflineTtsSampleRate
  SherpaOnnxWriteWave
  
  # ASR functions
  SherpaOnnxCreateRecognizer
  SherpaOnnxDestroyRecognizer
  SherpaOnnxRecognizerAcceptWaveform
  SherpaOnnxRecognizerEndpoint
  SherpaOnnxRecognizerInputFinished
  SherpaOnnxRecognizerIsEndpoint
  SherpaOnnxRecognizerReset
  SherpaOnnxRecognizerDecodedResult
  
  # VAD functions
  SherpaOnnxCreateVad
  SherpaOnnxDestroyVad
  SherpaOnnxVadAcceptWaveform
  SherpaOnnxVadIsEndpoint
  SherpaOnnxVadReset
  SherpaOnnxVadGetResult
  
  # Audio Tagging functions
  SherpaOnnxCreateAudioTagger
  SherpaOnnxAudioTaggerProcess
  SherpaOnnxDestroyAudioTagger
  
  # Speaker ID functions
  SherpaOnnxCreateSpeakerIdentification
  SherpaOnnxDestroySpeakerIdentification
  SherpaOnnxSpeakerIdentificationAcceptWaveform
  SherpaOnnxSpeakerIdentificationComputeEmbedding
  SherpaOnnxSpeakerIdentificationRegisterSpeaker
  SherpaOnnxSpeakerIdentificationRemoveSpeaker
  SherpaOnnxSpeakerIdentificationListSpeakers
  SherpaOnnxSpeakerIdentificationIdentifySpeaker
  SherpaOnnxSpeakerIdentificationVerifySpeaker
)

set(mangled_exported_functions)
foreach(x IN LISTS exported_functions)
  list(APPEND mangled_exported_functions "_${x}")
endforeach()
list(JOIN mangled_exported_functions "," all_exported_functions)

include_directories(${CMAKE_SOURCE_DIR})

# Set WASM build flags
set(MY_FLAGS " -s FORCE_FILESYSTEM=1 -s INITIAL_MEMORY=512MB -s ALLOW_MEMORY_GROWTH=1")
string(APPEND MY_FLAGS " -sSTACK_SIZE=20971520 ") # 20MB
string(APPEND MY_FLAGS " -sEXPORTED_FUNCTIONS=[_CopyHeap,_malloc,_free,${all_exported_functions}] ")
# Preload assets from TTS module
string(APPEND MY_FLAGS "--preload-file ${CMAKE_SOURCE_DIR}/wasm/tts/assets@./tts/assets ")
string(APPEND MY_FLAGS " -sEXPORTED_RUNTIME_METHODS=['ccall','stringToUTF8','setValue','getValue','lengthBytesUTF8','UTF8ToString','FS'] ")

message(STATUS "MY_FLAGS: ${MY_FLAGS}")

set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} ${MY_FLAGS}")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${MY_FLAGS}")
set(CMAKE_EXECUTBLE_LINKER_FLAGS "${CMAKE_EXECUTBLE_LINKER_FLAGS} ${MY_FLAGS}")

if (NOT CMAKE_EXECUTABLE_SUFFIX STREQUAL ".js")
  message(FATAL_ERROR "The default suffix for building executables should be .js!")
endif()

# Create main combined module
add_executable(sherpa-onnx-wasm-main-combined sherpa-onnx-wasm-main-combined.cc)
target_link_libraries(sherpa-onnx-wasm-main-combined sherpa-onnx-c-api)
install(TARGETS sherpa-onnx-wasm-main-combined DESTINATION bin/wasm/combined)

# Install all required files
install(
  FILES
    "$<TARGET_FILE_DIR:sherpa-onnx-wasm-main-combined>/sherpa-onnx-wasm-main-combined.js"
    "index.html"
    "sherpa-onnx-combined.js"
    "$<TARGET_FILE_DIR:sherpa-onnx-wasm-main-combined>/sherpa-onnx-wasm-main-combined.wasm"
    "$<TARGET_FILE_DIR:sherpa-onnx-wasm-main-combined>/sherpa-onnx-wasm-main-combined.data"
  DESTINATION
    bin/wasm/combined
)
EOF
  fi
  
  # Create main C++ file for combined module
  if [ ! -f "$SCRIPT_DIR/wasm/combined/sherpa-onnx-wasm-main-combined.cc" ]; then
    echo -e "${YELLOW}Creating C++ source file for combined module...${NC}"
    
    cat > "$SCRIPT_DIR/wasm/combined/sherpa-onnx-wasm-main-combined.cc" << 'EOF'
// wasm/combined/sherpa-onnx-wasm-main-combined.cc
//
// Combined WASM module for Sherpa-ONNX

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <algorithm>
#include <memory>

#include "sherpa-onnx/c-api/c-api.h"

extern "C" {

// Common functions used by all modules
void MyPrint(const char* message) {
  fprintf(stdout, "%s\n", message);
}

void CopyHeap(const char *src, int32_t num_bytes, char *dst) {
  std::copy(src, src + num_bytes, dst);
}

int32_t SherpaOnnxFileExists(const char *filename) {
  FILE *f = fopen(filename, "rb");
  if (!f) return -1;
  fclose(f);
  return 0;
}

// Additional wrapper functions can be added here if needed

}
EOF
  fi
  
  # Create JavaScript wrapper for combined module
  if [ ! -f "$SCRIPT_DIR/wasm/combined/sherpa-onnx-combined.js" ]; then
    echo -e "${YELLOW}Creating JavaScript wrapper for combined module...${NC}"
    
    cat > "$SCRIPT_DIR/wasm/combined/sherpa-onnx-combined.js" << 'EOF'
/**
 * Sherpa-ONNX Combined Module
 * 
 * This file provides a unified JavaScript API for all Sherpa-ONNX capabilities:
 * - TTS (Text-to-Speech)
 * - ASR (Automatic Speech Recognition)
 * - VAD (Voice Activity Detection)
 * - Audio Tagging
 * - Speaker Identification
 */

// Import wrapper from other modules and re-export
importScripts('./tts/sherpa-onnx-tts.js');
// We can import other module wrappers as needed here

// Export the combined API
const SherpaOnnxCombined = {
  // TTS capabilities - re-export from TTS module
  createOfflineTts: OfflineTts.createOfflineTts,
  
  // Add other capabilities as they are implemented
  // createRecognizer: ... 
  // createVad: ...
  // etc.
};

// Make it available globally
if (typeof window !== 'undefined') {
  window.SherpaOnnxCombined = SherpaOnnxCombined;
}

export default SherpaOnnxCombined;
EOF
  fi
  
  # Create a simple HTML test page
  if [ ! -f "$SCRIPT_DIR/wasm/combined/index.html" ]; then
    echo -e "${YELLOW}Creating test HTML page for combined module...${NC}"
    
    cat > "$SCRIPT_DIR/wasm/combined/index.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sherpa-ONNX Combined WASM Demo</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .section { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    h1 { color: #333; }
    button { padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; }
    button:hover { background: #45a049; }
    textarea { width: 100%; height: 100px; margin: 10px 0; }
    select { padding: 8px; margin: 5px 0; }
    .log { background: #f9f9f9; padding: 10px; height: 150px; overflow-y: auto; border: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>Sherpa-ONNX Combined WASM Demo</h1>
  
  <div class="section">
    <h2>Text-to-Speech (TTS)</h2>
    <textarea id="tts-text" placeholder="Enter text to synthesize...">Hello, this is a test of the combined WASM module.</textarea>
    <div>
      <label>Speaker ID: <select id="tts-speaker"></select></label>
      <label>Speed: <input type="number" id="tts-speed" value="1.0" min="0.5" max="2.0" step="0.1"></label>
    </div>
    <button id="tts-generate">Generate Speech</button>
    <button id="tts-stop">Stop</button>
    <audio id="tts-audio" controls></audio>
  </div>
  
  <div class="section">
    <h2>Log</h2>
    <div id="log" class="log"></div>
  </div>
  
  <script>
    // Add a log function
    function log(message) {
      const logElem = document.getElementById('log');
      logElem.innerHTML += `${message}<br>`;
      logElem.scrollTop = logElem.scrollHeight;
    }
    
    // Wait for module to load
    log('Loading Sherpa-ONNX Combined WASM module...');
    
    // Import the WASM module
    import('./sherpa-onnx-wasm-main-combined.js')
      .then((Module) => {
        log('WASM module loaded successfully');
        
        // Import the high-level API
        import('./sherpa-onnx-combined.js')
          .then(async (SherpaOnnxCombined) => {
            log('API module loaded successfully');
            
            // Initialize TTS
            try {
              const tts = await SherpaOnnxCombined.default.createOfflineTts(Module);
              log(`TTS initialized: sample rate=${tts.sampleRate}, speakers=${tts.numSpeakers}`);
              
              // Populate speaker dropdown
              const speakerSelect = document.getElementById('tts-speaker');
              for (let i = 0; i < tts.numSpeakers; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.text = `Speaker ${i}`;
                speakerSelect.appendChild(option);
              }
              
              // Set up TTS generate button
              document.getElementById('tts-generate').addEventListener('click', () => {
                const text = document.getElementById('tts-text').value;
                const speakerId = parseInt(document.getElementById('tts-speaker').value);
                const speed = parseFloat(document.getElementById('tts-speed').value);
                
                log(`Generating speech: "${text}" (speaker=${speakerId}, speed=${speed})`);
                
                const audio = tts.generate({
                  text: text,
                  sid: speakerId,
                  speed: speed
                });
                
                // Play the audio
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const audioBuffer = audioCtx.createBuffer(1, audio.samples.length, audio.sampleRate);
                const channelData = audioBuffer.getChannelData(0);
                channelData.set(audio.samples);
                
                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtx.destination);
                source.start();
                
                log('Speech generated and playing');
              });
              
              // Set up stop button
              document.getElementById('tts-stop').addEventListener('click', () => {
                // Implementation depends on how audio is played
                log('Stop requested');
              });
              
            } catch (error) {
              log(`Error initializing TTS: ${error.message}`);
            }
          })
          .catch(err => {
            log(`Failed to load API module: ${err.message}`);
          });
      })
      .catch(err => {
        log(`Failed to load WASM module: ${err.message}`);
      });
  </script>
</body>
</html>
EOF
  fi
  
  # Create a custom build script for the combined module
  if [ ! -f "$SCRIPT_DIR/wasm/combined/build-wasm-simd-combined.sh" ]; then
    echo -e "${YELLOW}Creating build script for combined module...${NC}"
    
    cat > "$SCRIPT_DIR/wasm/combined/build-wasm-simd-combined.sh" << 'EOF'
#!/usr/bin/env bash
# Build script for the combined Sherpa-ONNX WASM module

set -ex

if [ x"$EMSCRIPTEN" == x"" ]; then
  if ! command -v emcc &> /dev/null; then
    echo "Please install emscripten first"
    echo ""
    echo "You can use the following commands to install it:"
    echo ""
    echo "git clone https://github.com/emscripten-core/emsdk.git"
    echo "cd emsdk"
    echo "git pull"
    echo "./emsdk install 3.1.53"
    echo "./emsdk activate 3.1.53"
    echo "source ./emsdk_env.sh"
    exit 1
  else
    EMSCRIPTEN=$(dirname $(realpath $(which emcc)))
    emcc --version
  fi
fi

export EMSCRIPTEN=$EMSCRIPTEN
echo "EMSCRIPTEN: $EMSCRIPTEN"
if [ ! -f $EMSCRIPTEN/cmake/Modules/Platform/Emscripten.cmake ]; then
  echo "Cannot find $EMSCRIPTEN/cmake/Modules/Platform/Emscripten.cmake"
  echo "Please make sure you have installed emsdk correctly"
  echo "Hint: emsdk 3.1.53 is known to work. Other versions may not work"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHERPA_DIR=$(dirname $(dirname $SCRIPT_DIR))

# Create build directory for combined module
mkdir -p $SHERPA_DIR/build-wasm-simd-combined
pushd $SHERPA_DIR/build-wasm-simd-combined

export SHERPA_ONNX_IS_USING_BUILD_WASM_SH=ON

cmake \
  -DCMAKE_INSTALL_PREFIX=./install \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_TOOLCHAIN_FILE=$EMSCRIPTEN/cmake/Modules/Platform/Emscripten.cmake \
  \
  -DSHERPA_ONNX_ENABLE_PYTHON=OFF \
  -DSHERPA_ONNX_ENABLE_TESTS=OFF \
  -DSHERPA_ONNX_ENABLE_CHECK=OFF \
  -DBUILD_SHARED_LIBS=OFF \
  -DSHERPA_ONNX_ENABLE_PORTAUDIO=OFF \
  -DSHERPA_ONNX_ENABLE_JNI=OFF \
  -DSHERPA_ONNX_ENABLE_C_API=ON \
  -DSHERPA_ONNX_ENABLE_WEBSOCKET=OFF \
  -DSHERPA_ONNX_ENABLE_GPU=OFF \
  -DSHERPA_ONNX_ENABLE_WASM=ON \
  -DSHERPA_ONNX_ENABLE_WASM_TTS=ON \
  -DSHERPA_ONNX_ENABLE_WASM_ASR=ON \
  -DSHERPA_ONNX_ENABLE_WASM_VAD=ON \
  -DSHERPA_ONNX_ENABLE_WASM_KWS=ON \
  -DSHERPA_ONNX_ENABLE_WASM_SPEAKER_DIARIZATION=ON \
  -DSHERPA_ONNX_ENABLE_WASM_SPEECH_ENHANCEMENT=ON \
  -DSHERPA_ONNX_ENABLE_BINARY=OFF \
  -DSHERPA_ONNX_LINK_LIBSTDCPP_STATICALLY=OFF \
  -DSHERPA_ONNX_WASM_DIR=$SCRIPT_DIR \
  $SHERPA_DIR/wasm/combined

make -j$(nproc)
make install

ls -lh install/bin/wasm/combined
EOF
    
    chmod +x "$SCRIPT_DIR/wasm/combined/build-wasm-simd-combined.sh"
  fi
  
  # Run the custom build script
  echo -e "${BLUE}Running combined module build script...${NC}"
  cd "$SCRIPT_DIR"
  
  # Make a special copy of TTS assets for the combined build
  mkdir -p "$SCRIPT_DIR/wasm/tts/assets"
  cp -r "$SCRIPT_DIR/third_party/sherpa-onnx/wasm/tts/assets"/* "$SCRIPT_DIR/wasm/tts/assets/"
  
  # Run the build script
  ./wasm/combined/build-wasm-simd-combined.sh
  
  # Check if build succeeded
  if [ $? -ne 0 ]; then
    echo -e "${RED}Combined module build failed.${NC}"
    return 1
  fi
  
  # Copy the output files to the prebuilt directory
  echo -e "${GREEN}Combined module build completed. Copying files...${NC}"
  mkdir -p "$SCRIPT_DIR/prebuilt/web/combined"
  
  if [ -d "$SCRIPT_DIR/build-wasm-simd-combined/install/bin/wasm/combined" ]; then
    cp -r "$SCRIPT_DIR/build-wasm-simd-combined/install/bin/wasm/combined"/* "$SCRIPT_DIR/prebuilt/web/combined/"
    
    # Store the build output path
    export combined_build_path="$SCRIPT_DIR/build-wasm-simd-combined/install/bin/wasm/combined"
    
    # Also copy to the demo app directory
    mkdir -p "$SCRIPT_DIR/../apps/sherpa-onnx-demo/public/wasm/combined"
    cp -r "$SCRIPT_DIR/build-wasm-simd-combined/install/bin/wasm/combined"/* "$SCRIPT_DIR/../apps/sherpa-onnx-demo/public/wasm/combined/"
    
    echo -e "${GREEN}Combined module files copied to:${NC}"
    echo -e "${GREEN}- $SCRIPT_DIR/prebuilt/web/combined/${NC}"
    echo -e "${GREEN}- $SCRIPT_DIR/../apps/sherpa-onnx-demo/public/wasm/combined/${NC}"
  else
    echo -e "${RED}No build output found for combined module.${NC}"
    return 1
  fi
  
  return 0
}

# Track overall build success
OVERALL_SUCCESS=true
SUCCESSFUL_MODULES=()
FAILED_MODULES=()

# Build modules based on selection
if [ "$BUILD_TYPE" = "combined" ]; then
  if build_combined_module; then
    SUCCESSFUL_MODULES+=("combined")
  else
    FAILED_MODULES+=("combined")
    OVERALL_SUCCESS=false
  fi
else
  # Build individual modules as before
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
  
  if [[ "$module" == "tts" ]] || [[ "$module" == "combined" ]]; then
    echo -e "\n${BLUE}For integration in React Native Web:${NC}"
    echo -e "${YELLOW}1. Copy files from $build_path to your public directory${NC}"
    echo -e "${YELLOW}   mkdir -p $SCRIPT_DIR/../apps/sherpa-onnx-demo/public/wasm/${module}"
    echo -e "${YELLOW}   cp -r \"$build_path\"/* $SCRIPT_DIR/../apps/sherpa-onnx-demo/public/wasm/${module}/"
    echo -e "${YELLOW}2. Import the module in your code:${NC}"
    
    if [[ "$module" == "tts" ]]; then
      echo -e "${YELLOW}   const SherpaOnnxTts = await import('/wasm/tts/sherpa-onnx-tts.js');${NC}"
      echo -e "${YELLOW}3. Initialize with: const tts = await SherpaOnnxTts.default.create({});${NC}"
    else
      echo -e "${YELLOW}   const SherpaOnnxCombined = await import('/wasm/combined/sherpa-onnx-combined.js');${NC}"
      echo -e "${YELLOW}3. Initialize with: const module = await SherpaOnnxCombined.default;${NC}"
    fi
  fi
done

# Fix the exit code issue - convert boolean to numeric
if $OVERALL_SUCCESS; then
  exit 0
else
  exit 1
fi 