require "json"

# Folly compiler flags for React Native New Architecture, without disabling warnings
folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1'

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

  # Include source files for both architectures
  s.source_files = ["ios/*.{h,m,mm,swift}", "ios/bridge/*.{h,m,mm,swift}", "ios/native/*.{h,m,mm,swift}"]

  # Vendored libraries pointing to a dynamic 'current' directory
  s.vendored_libraries = [
    "prebuilt/ios/current/libonnxruntime.a",
    "prebuilt/ios/current/libsherpa-onnx-c-api.a",
    "prebuilt/ios/current/libsherpa-onnx-core.a",
    "prebuilt/ios/current/libsherpa-onnx-cxx-api.a",
    "prebuilt/ios/current/libsherpa-onnx-fst.a",
    "prebuilt/ios/current/libsherpa-onnx-fstfar.a",
    "prebuilt/ios/current/libsherpa-onnx-kaldifst-core.a",
    "prebuilt/ios/current/libkaldi-decoder-core.a",
    "prebuilt/ios/current/libkaldi-native-fbank-core.a",
    "prebuilt/ios/current/libpiper_phonemize.a",
    "prebuilt/ios/current/libespeak-ng.a",
    "prebuilt/ios/current/libssentencepiece_core.a",
    "prebuilt/ios/current/libucd.a",
    "prebuilt/ios/current/libcargs.a"
  ]

  s.frameworks = "Foundation", "CoreML", "Accelerate", "CoreVideo"

  s.preserve_paths = "prebuilt/include/**", "prebuilt/include/module.modulemap"

  s.xcconfig = {
    "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/prebuilt/include\" \"$(PODS_ROOT)/Headers/Public/React-Core\"",
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
    "APPLICATION_EXTENSION_API_ONLY" => "NO"
  }

  # Set up initial symlinks to device libraries
  s.prepare_command = <<-CMD
    mkdir -p prebuilt/ios/current
    for lib in libonnxruntime.a libsherpa-onnx-c-api.a libsherpa-onnx-core.a libsherpa-onnx-cxx-api.a libsherpa-onnx-fst.a libsherpa-onnx-fstfar.a libsherpa-onnx-kaldifst-core.a libkaldi-decoder-core.a libkaldi-native-fbank-core.a libpiper_phonemize.a libespeak-ng.a libssentencepiece_core.a libucd.a libcargs.a; do
      ln -sf ../device/$lib prebuilt/ios/current/$lib
    done
  CMD

  # Dynamically update symlinks based on platform
  s.script_phase = {
    :name => "Link Sherpa ONNX Libraries",
    :script => '
      if [[ "$PLATFORM_NAME" == *simulator* ]]; then
        echo "Symlinking simulator libraries"
        rm -rf "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/*"
        for lib in libonnxruntime.a libsherpa-onnx-c-api.a libsherpa-onnx-core.a libsherpa-onnx-fst.a libsherpa-onnx-fstfar.a libsherpa-onnx-kaldifst-core.a libkaldi-decoder-core.a libkaldi-native-fbank-core.a libpiper_phonemize.a libespeak-ng.a libssentencepiece_core.a libucd.a; do
          ln -sf ../simulator/$lib "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/$lib"
        done
      else
        echo "Using device libraries"
      fi
    ',
    :execution_position => :before_compile,
    :output_files => [
      "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/libonnxruntime.a",
      "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/libsherpa-onnx-c-api.a",
      "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/libsherpa-onnx-core.a",
      "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/libsherpa-onnx-fst.a",
      "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/libsherpa-onnx-fstfar.a",
      "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/libsherpa-onnx-kaldifst-core.a",
      "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/libkaldi-decoder-core.a",
      "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/libkaldi-native-fbank-core.a",
      "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/libpiper_phonemize.a",
      "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/libespeak-ng.a",
      "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/libssentencepiece_core.a",
      "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/libucd.a"
    ]
  }

  # Use install_modules_dependencies helper for React Native >= 0.71.0
  if respond_to?(:install_modules_dependencies, true)
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"

    # Enable both old and new architecture
    if ENV['RCT_NEW_ARCH_ENABLED'] == '1'
      s.compiler_flags = folly_compiler_flags + " -DRCT_NEW_ARCH_ENABLED=1"
      s.pod_target_xcconfig = {
        "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
        "OTHER_LDFLAGS" => "-framework CoreML -framework Accelerate -framework CoreVideo",
        "DEFINES_MODULE" => "YES",
        "SWIFT_OBJC_BRIDGING_HEADER" => "",
        "SWIFT_INSTALL_OBJC_HEADER" => "YES",
        "SWIFT_OBJC_INTERFACE_HEADER_NAME" => "sherpa-onnx-rn-Swift.h",
        "APPLICATION_EXTENSION_API_ONLY" => "NO",
        "HEADER_SEARCH_PATHS" => [
          "\"$(PODS_TARGET_SRCROOT)/prebuilt/include\"",
          "\"$(PODS_ROOT)/Headers/Public/React-Core\"",
          "\"$(PODS_ROOT)/Headers/Public/ReactCommon\"",
          "\"$(PODS_ROOT)/boost\"",
          "\"$(PODS_ROOT)/boost-for-react-native\"",
          "\"$(PODS_ROOT)/RCT-Folly\"",
          "\"${PODS_ROOT}/Headers/Public/React-Codegen/react/renderer/components\""
        ].join(" ")
      }
      s.dependency "React-RCTFabric"
      s.dependency "React-Codegen"
      s.dependency "RCT-Folly"
      s.dependency "RCTRequired"
      s.dependency "RCTTypeSafety"
      s.dependency "ReactCommon/turbomodule/core"
    end
  end
end