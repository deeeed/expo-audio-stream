require "json"

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

  # Include only our own implementation files
  s.source_files = ["ios/bridge/*.{h,m,mm,swift}"]
  
  # Prebuilt static libraries - explicitly list the ONNX Runtime libraries
  s.vendored_libraries = [
    "prebuilt/ios/libonnxruntime.a",
    "prebuilt/ios/libsherpa-onnx-c-api.a",
    "prebuilt/ios/libsherpa-onnx-core.a",
    "prebuilt/ios/libsherpa-onnx-cxx-api.a",
    "prebuilt/ios/libsherpa-onnx-fst.a", 
    "prebuilt/ios/libsherpa-onnx-fstfar.a",
    "prebuilt/ios/libsherpa-onnx-kaldifst-core.a",
    "prebuilt/ios/libkaldi-decoder-core.a",
    "prebuilt/ios/libkaldi-native-fbank-core.a",
    "prebuilt/ios/libpiper_phonemize.a",
    "prebuilt/ios/libespeak-ng.a",
    "prebuilt/ios/libssentencepiece_core.a",
    "prebuilt/ios/libucd.a",
    "prebuilt/ios/libcargs.a"
  ]
  
  # Dependencies for ONNX Runtime
  s.frameworks = "Foundation", "CoreML", "Accelerate", "CoreVideo"
  
  # Preserve header files and module map
  s.preserve_paths = "prebuilt/include/**", "prebuilt/include/module.modulemap"
  
  # Search paths for headers and libraries
  s.xcconfig = {
    "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/prebuilt/include\"",
    "LIBRARY_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/prebuilt/ios\"",
    "SWIFT_INCLUDE_PATHS" => "\"$(PODS_TARGET_SRCROOT)/prebuilt/include\""
  }
  
  # Swift module configuration
  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
    "OTHER_LDFLAGS" => "-lstdc++ -framework CoreML -framework Accelerate -framework CoreVideo",
    "DEFINES_MODULE" => "YES",
    "SWIFT_OBJC_BRIDGING_HEADER" => "",
    "SWIFT_INSTALL_OBJC_HEADER" => "YES",
    "SWIFT_OBJC_INTERFACE_HEADER_NAME" => "sherpa-onnx-rn-Swift.h",
    "APPLICATION_EXTENSION_API_ONLY" => "NO"
  }
  
  # React Native dependencies
  install_modules_dependencies(s)
end