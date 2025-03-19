require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32'

Pod::Spec.new do |s|
  s.name         = "Essentia"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "15.1" }
  s.source       = { :git => "https://github.com/deeeed/expo-audio-stream/.git", :tag => "#{s.version}" }

  # Source files
  s.source_files = [
    "cpp/third_party/nlohmann/json.hpp",
    "ios/WrapEssentia.{h,mm}",
    "cpp/Utils.h",
    "cpp/EssentiaWrapper.{h,cpp}",
    "cpp/FeatureExtractor.{h,cpp}",
  ]

  # Vendored library (symlinked dynamically)
  s.vendored_libraries = "ios/Frameworks/libEssentiaPrebuilt.a"

  # Preserve original libraries
  s.preserve_paths = [
    "ios/Frameworks/device/Essentia_iOS.a",
    "ios/Frameworks/simulator/Essentia_Sim.a"
  ]

  # Script to symlink the correct library based on platform
  s.script_phase = {
    :name => 'Link Essentia Library',
    :script => '
      echo "Script running for PLATFORM_NAME=$PLATFORM_NAME ARCHS=$ARCHS"
      mkdir -p "${PODS_TARGET_SRCROOT}/ios/Frameworks"
      if [[ "$PLATFORM_NAME" == *simulator* ]]; then
        echo "Symlinking Essentia Simulator Library"
        ln -sf "${PODS_TARGET_SRCROOT}/ios/Frameworks/simulator/Essentia_Sim.a" "${PODS_TARGET_SRCROOT}/ios/Frameworks/libEssentiaPrebuilt.a"
      else
        echo "Symlinking Essentia Device Library"
        ln -sf "${PODS_TARGET_SRCROOT}/ios/Frameworks/device/Essentia_iOS.a" "${PODS_TARGET_SRCROOT}/ios/Frameworks/libEssentiaPrebuilt.a"
      fi
      ls -l "${PODS_TARGET_SRCROOT}/ios/Frameworks/"
    ',
    :execution_position => :before_compile,
    :output_files => ["${PODS_TARGET_SRCROOT}/ios/Frameworks/libEssentiaPrebuilt.a"]
  }

  # Prepare command (simplified)
  s.prepare_command = <<-CMD
  if [ ! -f ios/Frameworks/device/Essentia_iOS.a ]; then
    echo "WARNING: Essentia library not found at ios/Frameworks/device/Essentia_iOS.a"
    echo "Please run the build-essentia-ios.sh script first"
  else
    echo "Found Essentia device library"
  fi

  if [ ! -f ios/Frameworks/simulator/Essentia_Sim.a ]; then
    echo "WARNING: Essentia simulator library not found at ios/Frameworks/simulator/Essentia_Sim.a"
    echo "Please run the build-essentia-ios.sh script first"
  else
    echo "Found Essentia simulator library"
  fi
CMD

  s.user_target_xcconfig = {
    'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'arm64',
    'VALID_ARCHS' => 'arm64 x86_64'
  }

  s.pod_target_xcconfig = {
    'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'arm64',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
    'CLANG_CXX_LIBRARY' => 'libc++',
    'HEADER_SEARCH_PATHS' => '"${PODS_TARGET_SRCROOT}" "${PODS_TARGET_SRCROOT}/cpp" "${PODS_TARGET_SRCROOT}/cpp/include" "${PODS_TARGET_SRCROOT}/cpp/third_party"',
    'GCC_PREPROCESSOR_DEFINITIONS' => 'ESSENTIA_EXPORTS=1',
    'VALID_ARCHS' => 'arm64 x86_64'
  }

  s.requires_arc = true
  s.frameworks = "Foundation", "Accelerate", "CoreAudio"

  if respond_to?(:install_modules_dependencies, true)
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"

    if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
      s.compiler_flags = folly_compiler_flags + " -DRCT_NEW_ARCH_ENABLED=1"
      s.pod_target_xcconfig = {
        "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/boost\" \"${PODS_TARGET_SRCROOT}\" \"${PODS_TARGET_SRCROOT}/cpp\" \"${PODS_TARGET_SRCROOT}/cpp/include\" \"${PODS_TARGET_SRCROOT}/cpp/third_party\"",
        "OTHER_CPLUSPLUSFLAGS" => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1",
        "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
        "GCC_PREPROCESSOR_DEFINITIONS" => "ESSENTIA_EXPORTS=1",
        "EXCLUDED_ARCHS[sdk=iphonesimulator*]" => "arm64",
        "VALID_ARCHS" => "arm64 x86_64"
      }
      s.dependency "React-Codegen"
      s.dependency "RCT-Folly"
      s.dependency "RCTRequired"
      s.dependency "RCTTypeSafety"
      s.dependency "ReactCommon/turbomodule/core"
    end
  end
end