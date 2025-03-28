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

  # Initialize source_files once
  source_files = [
    "ios/*.{h,m,mm,swift}", 
    "ios/bridge/*.{h,m,mm,swift}", 
    "ios/native/*.{h,m,mm,swift}", 
    "ios/codegen/SherpaOnnxSpec/*.{h,mm}"
  ]

  # Initialize preserve_paths once
  preserve_paths = [
    "prebuilt/include/**", 
    "prebuilt/include/module.modulemap",
    "prebuilt/ios/device/**",
    "prebuilt/ios/simulator/**"
  ]

  # Set the initial values
  s.source_files = source_files
  s.preserve_paths = preserve_paths

  # List of libraries to link
  sherpa_libraries = [
    "libonnxruntime.a",
    "libsherpa-onnx-c-api.a",
    "libsherpa-onnx-core.a",
    "libsherpa-onnx-cxx-api.a",
    "libsherpa-onnx-fst.a",
    "libsherpa-onnx-fstfar.a",
    "libsherpa-onnx-kaldifst-core.a",
    "libkaldi-decoder-core.a",
    "libkaldi-native-fbank-core.a",
    "libpiper_phonemize.a",
    "libespeak-ng.a",
    "libssentencepiece_core.a",
    "libucd.a",
    "libcargs.a"
  ]

  # Vendored libraries pointing to the current folder (will be symlinked later)
  s.vendored_libraries = sherpa_libraries.map { |lib| "prebuilt/ios/current/#{lib}" }

  s.frameworks = "Foundation", "CoreML", "Accelerate", "CoreVideo"

  s.xcconfig = {
    "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/prebuilt/include\" \"$(PODS_ROOT)/Headers/Public/React-Core\" \"$(PODS_TARGET_SRCROOT)/ios/codegen\"",
    "LIBRARY_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/prebuilt/ios/current\"",
    "SWIFT_INCLUDE_PATHS" => "\"$(PODS_TARGET_SRCROOT)/prebuilt/include\""
  }

  s.pod_target_xcconfig = {
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
        echo "Warning: Device libraries directory not found"
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
          echo "Error: Simulator libraries directory not found at $SIMULATOR_DIR"
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
          echo "Error: Device libraries directory not found at $DEVICE_DIR"
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
    
    # Append to preserve_paths
    s.preserve_paths = preserve_paths + ["build/generated/ios/**"]
    
    # Add generated files to source files for new architecture
    s.source_files = source_files + ["build/generated/ios/**/*.{h,mm,cpp}"]

    # Define all header search paths explicitly for new architecture
    s.pod_target_xcconfig = {
      "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
      "OTHER_LDFLAGS" => "-framework CoreML -framework Accelerate -framework CoreVideo",
      "DEFINES_MODULE" => "YES",
      "SWIFT_OBJC_BRIDGING_HEADER" => "",
      "SWIFT_INSTALL_OBJC_HEADER" => "YES", 
      "SWIFT_OBJC_INTERFACE_HEADER_NAME" => "sherpa-onnx-rn-Swift.h",
      "APPLICATION_EXTENSION_API_ONLY" => "NO",
      "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/prebuilt/include\" \"$(PODS_ROOT)/Headers/Public/React-Core\" \"$(PODS_TARGET_SRCROOT)/ios/codegen\" \"$(PODS_ROOT)/Headers/Public/ReactCommon\" \"$(PODS_ROOT)/Headers/Public/React-Codegen\" \"$(PODS_TARGET_SRCROOT)/build/generated/ios\" \"$(PODS_TARGET_SRCROOT)/build/generated/ios/SherpaOnnxSpec\" \"$(PODS_ROOT)/boost\" \"$(PODS_ROOT)/boost-for-react-native\" \"$(PODS_ROOT)/RCT-Folly\" \"${PODS_ROOT}/Headers/Public/React-Codegen/react/renderer/components\" \"$(PODS_CONFIGURATION_BUILD_DIR)/React-Codegen/React_Codegen.framework/Headers\"",
      "CLANG_ENABLE_MODULES" => "YES",
      "CLANG_ENABLE_CPP_STATIC_LIBRARY_TYPES" => "YES"
    }

    # New Architecture dependencies
    s.dependency "React-RCTFabric"
    s.dependency "React-Codegen"
    s.dependency "RCT-Folly"
    s.dependency "RCTRequired"
    s.dependency "RCTTypeSafety"
    s.dependency "ReactCommon/turbomodule/core"
  end
end