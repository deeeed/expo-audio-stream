require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "Archiver"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/deeeed/siteed-archiver.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,cpp}", "ios/generated/**/*-generated.cpp"
  s.private_header_files = "ios/generated/**/*.h"

  # Preserve all prebuilt directories
  s.preserve_paths = [
    "prebuilt/**/*",
    "prebuilt/ios/**/*"
  ]

  # Define our libraries
  archive_libraries = ["libarchive.a"]
  
  # Vendored libraries
  s.vendored_libraries = archive_libraries.map { |lib| "prebuilt/ios/current/#{lib}" }

  # System libraries
  s.libraries = ['bz2', 'iconv', 'z']

  # Common header and library search paths
  common_header_search_paths = [
    "\"$(PODS_TARGET_SRCROOT)/prebuilt/ios/include\"",
    "\"$(PODS_ROOT)/Headers/Public/React-Core\"",
    "\"$(PODS_ROOT)/boost\"",
    "\"$(PODS_ROOT)/DoubleConversion\"",
    "\"$(PODS_ROOT)/RCT-Folly\"",
    "\"$(PODS_ROOT)/Headers/Private/React-Core\""
  ]

  # Set up xcconfig with proper React Native New Architecture settings
  s.pod_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => common_header_search_paths.join(" "),
    "LIBRARY_SEARCH_PATHS" => [
      "\"$(PODS_TARGET_SRCROOT)/prebuilt/ios/current\"",
      "\"$(PODS_TARGET_SRCROOT)/prebuilt/ios/iphoneos-arm64/lib\""
    ].join(" "),
    "OTHER_LDFLAGS" => "-lbz2 -liconv -lz",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
  }

  # Initial symlink setup
  s.prepare_command = <<-CMD
    echo "Creating prebuilt/ios/current directory"
    mkdir -p prebuilt/ios/current
    
    # Only setup the symlinks if they don't exist
    if [ ! -f prebuilt/ios/current/libarchive.a ]; then
      echo "Setting up initial symlinks to device libraries"
      
      # Check if iphoneos-arm64 libs exist
      if [ -d prebuilt/ios/iphoneos-arm64/lib ]; then
        for lib in #{archive_libraries.join(" ")}; do
          if [ -f "prebuilt/ios/iphoneos-arm64/lib/$lib" ]; then
            echo "Linking $lib from iphoneos-arm64 folder"
            ln -sf "../iphoneos-arm64/lib/$lib" "prebuilt/ios/current/$lib"
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

  # Dynamic symlink script
  s.script_phase = {
    :name => "Link Archiver Libraries",
    :script => '
      set -e
      CURRENT_DIR="${PODS_TARGET_SRCROOT}/prebuilt/ios/current"
      DEVICE_DIR="${PODS_TARGET_SRCROOT}/prebuilt/ios/iphoneos-arm64/lib"
      SIMULATOR_DIR="${PODS_TARGET_SRCROOT}/prebuilt/ios/iphonesimulator-arm64/lib"
      
      # Make sure the current directory exists
      mkdir -p "$CURRENT_DIR"
      
      # Remove existing symlinks
      rm -f "$CURRENT_DIR"/*.a
      
      # Check if building for simulator
      if [[ "$PLATFORM_NAME" == *simulator* ]]; then
        echo "Building for simulator, linking simulator libraries"
        if [ -d "$SIMULATOR_DIR" ]; then
          for lib in ' + archive_libraries.join(" ") + '; do
            if [ -f "$SIMULATOR_DIR/$lib" ]; then
              echo "Linking $lib from simulator"
              ln -sf "../iphonesimulator-arm64/lib/$lib" "$CURRENT_DIR/$lib"
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
          for lib in ' + archive_libraries.join(" ") + '; do
            if [ -f "$DEVICE_DIR/$lib" ]; then
              echo "Linking $lib from device"
              ln -sf "../iphoneos-arm64/lib/$lib" "$CURRENT_DIR/$lib"
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
    :output_files => archive_libraries.map { |lib| "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/#{lib}" }
  }

  # Use install_modules_dependencies helper to install the dependencies if React Native version >=0.71.0.
  # This properly adds the right dependencies based on whether new architecture is enabled
  if respond_to?(:install_modules_dependencies, true)
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"
  end
end