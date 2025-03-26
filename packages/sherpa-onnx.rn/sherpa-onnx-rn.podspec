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

  # Include both our bridge code and the official Sherpa ONNX Swift API
  s.source_files = [
    "ios/**/*.{swift,h,m,mm}",    # Our React Native bridge code
    "prebuilt/swift/**/*.swift"    # Official Sherpa ONNX Swift API
  ]
  
  # Use libraries from prebuilt folder
  s.vendored_libraries = "prebuilt/ios/*.a"
  
  # Include the Sherpa ONNX headers
  s.preserve_paths = "prebuilt/include/**", "prebuilt/swift/**/*.h"
  s.xcconfig = {
    "HEADER_SEARCH_PATHS" => "\"${PODS_TARGET_SRCROOT}/prebuilt/include\"",
    "LIBRARY_SEARCH_PATHS" => "\"${PODS_TARGET_SRCROOT}/prebuilt/ios\""
  }

  # Configure Swift
  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "SWIFT_OBJC_INTERFACE_HEADER_NAME" => "sherpa-onnx-rn-Swift.h",
    "SWIFT_VERSION" => "5.0",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
    "OTHER_LDFLAGS" => "-lstdc++",
    "SWIFT_INCLUDE_PATHS" => "\"${PODS_TARGET_SRCROOT}/prebuilt/include\"",
    "SWIFT_OBJC_BRIDGING_HEADER" => "\"${PODS_TARGET_SRCROOT}/prebuilt/swift/sherpa-onnx/SherpaOnnx-Bridging-Header.h\""
  }
  
  # Set Swift version
  s.swift_version = "5.0"

  # Add resource bundles for model files
  s.resource_bundles = {
    'sherpa-onnx-models' => ['ios/models/**/*']
  }
  
  # Enable Swift
  s.requires_arc = true
  s.static_framework = true
  
  install_modules_dependencies(s)
end 