require "json"

# Folly compiler flags for React Native New Architecture, without disabling warnings
folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1'
fabric_enabled = ENV['RCT_NEW_ARCH_ENABLED'] == '1'

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "sherpa-onnx-rn"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "11.0" }
  s.source       = { :git => "https://github.com/deeeed/expo-audio-stream.git", :tag => "#{s.version}" }

  # Base source files for both architectures
  base_source_files = [
    "ios/*.{h,m,mm,swift}", 
    "ios/bridge/*.{h,m,mm,swift}", 
    "ios/native/*.{h,m,mm,swift}",
    "ios/handlers/*.{h,m,mm,swift}",
    "ios/utils/*.{h,m,mm,swift}"
  ]

  # New architecture specific source files
  new_arch_source_files = [
    "ios/codegen/SherpaOnnxSpec/*.{h,mm}"
  ]

  # Initialize preserve_paths once
  preserve_paths = [
    "prebuilt/include/**", 
    "prebuilt/include/module.modulemap",
    "prebuilt/ios/device/**",
    "prebuilt/ios/simulator/**"
  ]

  # Set source files based on architecture
  if fabric_enabled
    s.source_files = base_source_files + new_arch_source_files
  else
    s.source_files = base_source_files
  end

  s.preserve_paths = preserve_paths

  # List of libraries to link (order matters for dependency resolution)
  sherpa_libraries = [
    "libkissfft-float.a",
    "libkaldi-native-fbank-core.a",
    "libkaldi-decoder-core.a",
    "libsherpa-onnx-fst.a",
    "libsherpa-onnx-fstfar.a",
    "libsherpa-onnx-kaldifst-core.a",
    "libsherpa-onnx-core.a",
    "libsherpa-onnx-c-api.a",
    "libpiper_phonemize.a",
    "libespeak-ng.a",
    "libssentencepiece_core.a",
    "libucd.a",
    "libonnxruntime.a"
  ]

  # Vendored libraries pointing to the current folder (will be symlinked later)
  s.vendored_libraries = sherpa_libraries.map { |lib| "prebuilt/ios/current/#{lib}" }

  s.frameworks = "Foundation", "CoreML", "Accelerate", "CoreVideo"
  s.libraries = "c++", "bz2"

  # Base xcconfig for both architectures
  base_xcconfig = {
    "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/prebuilt/include\" \"$(PODS_ROOT)/Headers/Public/React-Core\"",
    "LIBRARY_SEARCH_PATHS" => "$(PODS_TARGET_SRCROOT)/prebuilt/ios/current",
    "SWIFT_INCLUDE_PATHS" => "\"$(PODS_TARGET_SRCROOT)/prebuilt/include\""
  }
  
  # Add additional header paths for new architecture
  if fabric_enabled
    base_xcconfig["HEADER_SEARCH_PATHS"] += " \"$(PODS_TARGET_SRCROOT)/ios/codegen\" \"$(PODS_ROOT)/Headers/Public/ReactCommon\" \"$(PODS_ROOT)/Headers/Public/React-Codegen\" \"$(PODS_ROOT)/boost\" \"$(PODS_ROOT)/boost-for-react-native\" \"$(PODS_ROOT)/RCT-Folly\" \"${PODS_ROOT}/Headers/Public/React-Codegen/react/renderer/components\" \"$(PODS_CONFIGURATION_BUILD_DIR)/React-Codegen/React_Codegen.framework/Headers\""
  end
  
  s.xcconfig = base_xcconfig

  # Base pod target xcconfig
  pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
    "OTHER_LDFLAGS" => "-framework CoreML -framework Accelerate -framework CoreVideo",
    "DEFINES_MODULE" => "YES",
    "SWIFT_OBJC_BRIDGING_HEADER" => "",
    "SWIFT_INSTALL_OBJC_HEADER" => "YES",
    "SWIFT_OBJC_INTERFACE_HEADER_NAME" => "sherpa-onnx-rn-Swift.h",
    "APPLICATION_EXTENSION_API_ONLY" => "NO",
    "CLANG_ENABLE_MODULES" => "YES",
    "CLANG_ENABLE_CPP_STATIC_LIBRARY_TYPES" => "YES"
  }
  
  # Add compiler flags for new architecture
  if fabric_enabled
    pod_target_xcconfig["HEADER_SEARCH_PATHS"] = base_xcconfig["HEADER_SEARCH_PATHS"]
  end
  
  s.pod_target_xcconfig = pod_target_xcconfig

  # Set up initial symlinks to device libraries - this runs during pod installation
  s.prepare_command = <<-CMD
    echo "Creating prebuilt/ios/current directory"
    mkdir -p prebuilt/ios/current
    
    # Only setup the symlinks if they don't exist
    if [ ! -f prebuilt/ios/current/libonnxruntime.a ]; then
      echo "Setting up initial symlinks to device libraries"
      
      # First check if device libs exist
      if [ -d prebuilt/ios/device ]; then
        for lib in #{sherpa_libraries.join(" ")}; do
          if [ -f "prebuilt/ios/device/$lib" ]; then
            echo "Linking $lib from device folder"
            ln -sf "../device/$lib" "prebuilt/ios/current/$lib"
          else
            echo "Warning: Device library $lib not found"
          fi
        done
      else
        echo ""
        echo "❌ ERROR: iOS libraries not found!"
        echo ""
        echo "The sherpa-onnx iOS libraries need to be built before using this package."
        echo ""
        echo "To fix this error, run the following commands:"
        echo "  cd $(pwd)"
        echo "  ./build-sherpa-ios.sh"
        echo ""
        echo "This will download and build the required iOS libraries."
        echo "The build process may take 5-10 minutes."
        echo ""
        exit 1
      fi
    else
      echo "Symlinks already exist, skipping"
    fi
  CMD

  # Dynamically update symlinks based on platform - this runs during build
  s.script_phase = {
    :name => "Link Sherpa ONNX Libraries",
    :script => '
      set -e
      CURRENT_DIR="${PODS_TARGET_SRCROOT}/prebuilt/ios/current"
      DEVICE_DIR="${PODS_TARGET_SRCROOT}/prebuilt/ios/device"
      SIMULATOR_DIR="${PODS_TARGET_SRCROOT}/prebuilt/ios/simulator"
      
      # Make sure the current directory exists
      mkdir -p "$CURRENT_DIR"
      
      # Remove existing symlinks
      rm -f "$CURRENT_DIR"/*.a
      
      # Check if building for simulator
      if [[ "$PLATFORM_NAME" == *simulator* ]]; then
        echo "Building for simulator, linking simulator libraries"
        if [ -d "$SIMULATOR_DIR" ]; then
          for lib in ' + sherpa_libraries.join(" ") + '; do
            if [ -f "$SIMULATOR_DIR/$lib" ]; then
              echo "Linking $lib from simulator"
              ln -sf "../simulator/$lib" "$CURRENT_DIR/$lib"
            else
              echo "Warning: Simulator library $lib not found"
            fi
          done
        else
          echo ""
          echo "❌ ERROR: iOS Simulator libraries not found!"
          echo ""
          echo "Building for iOS Simulator but libraries are missing at:"
          echo "  $SIMULATOR_DIR"
          echo ""
          echo "To fix this error:"
          echo "  1. cd ${PODS_TARGET_SRCROOT}"
          echo "  2. ./build-sherpa-ios.sh"
          echo ""
          echo "This will build both device and simulator libraries."
          echo ""
          exit 1
        fi
      else
        echo "Building for device, linking device libraries"
        if [ -d "$DEVICE_DIR" ]; then
          for lib in ' + sherpa_libraries.join(" ") + '; do
            if [ -f "$DEVICE_DIR/$lib" ]; then
              echo "Linking $lib from device"
              ln -sf "../device/$lib" "$CURRENT_DIR/$lib"
            else
              echo "Warning: Device library $lib not found"
            fi
          done
        else
          echo ""
          echo "❌ ERROR: iOS Device libraries not found!"
          echo ""
          echo "Building for iOS Device but libraries are missing at:"
          echo "  $DEVICE_DIR"
          echo ""
          echo "To fix this error:"
          echo "  1. cd ${PODS_TARGET_SRCROOT}"
          echo "  2. ./build-sherpa-ios.sh"
          echo ""
          echo "This will build both device and simulator libraries."
          echo ""
          exit 1
        fi
      fi
    ',
    :execution_position => :before_compile,
    :output_files => sherpa_libraries.map { |lib| "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/#{lib}" }
  }

  # Core dependency
  s.dependency "React-Core"

  # For new architecture (Fabric)
  if fabric_enabled
    s.compiler_flags = folly_compiler_flags + " -DRCT_NEW_ARCH_ENABLED=1"
    
    # New Architecture dependencies
    s.dependency "React-RCTFabric"
    s.dependency "React-Codegen"
    s.dependency "RCT-Folly"
    s.dependency "RCTRequired"
    s.dependency "RCTTypeSafety"
    s.dependency "ReactCommon/turbomodule/core"
    
    # Install TurboModule dependencies
    install_modules_dependencies(s)
  end
end