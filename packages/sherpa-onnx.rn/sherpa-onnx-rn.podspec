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

  s.source_files = "ios/**/*.{h,m,mm}"
  s.vendored_libraries = "ios/libs/*.a"
  
  # Include the Sherpa ONNX headers
  s.preserve_paths = "ios/include/**"
  s.xcconfig = {
    "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/#{s.name}/ios/include/**\""
  }

  # This is critical for New Architecture
  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "SWIFT_OBJC_INTERFACE_HEADER_NAME" => "sherpa-onnx-rn-Swift.h",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
  }
  
  install_modules_dependencies(s)
end 