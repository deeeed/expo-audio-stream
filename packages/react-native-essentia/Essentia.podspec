require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32'

# Determine min iOS version
min_ios_version_supported = '13.0'  # Add this if missing

Pod::Spec.new do |s|
  s.name         = "Essentia"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/deeeed/expo-audio-stream/.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm}", "cpp/**/*.{hpp,cpp,c,h}"
  s.exclude_files = "cpp/JNIBindings.cpp"

  # Add pre-built Essentia library
  s.vendored_libraries = "ios/Frameworks/libessentia.a"

  # Or if universal doesn't exist, use architecture-specific libraries
  s.user_target_xcconfig = { 'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'arm64' }
  s.pod_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => "$(inherited) \"$(PODS_ROOT)/#{s.name}/cpp/include\" \"$(PODS_ROOT)/#{s.name}/cpp\"",
    "LIBRARY_SEARCH_PATHS" => "$(inherited) \"$(PODS_ROOT)/#{s.name}/ios/Frameworks\"",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++14",
    "VALID_ARCHS" => "arm64 x86_64"
  }

  # Add required frameworks
  s.frameworks = "Accelerate"

  # Set linking flags
  s.libraries = ["essentia", "stdc++"]

  # Use install_modules_dependencies helper to install the dependencies if React Native version >=0.71.0.
  if respond_to?(:install_modules_dependencies, true)
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"

    # Don't install the dependencies when we run `pod install` in the old architecture.
    if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
      s.compiler_flags = folly_compiler_flags + " -DRCT_NEW_ARCH_ENABLED=1"
      s.pod_target_xcconfig    = {
          "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/boost\" $(inherited) \"$(PODS_ROOT)/#{s.name}/cpp/include\" \"$(PODS_ROOT)/#{s.name}/third_party/essentia/src\"",
          "LIBRARY_SEARCH_PATHS" => "$(inherited) \"$(PODS_ROOT)/#{s.name}/ios/Frameworks\"",
          "OTHER_CPLUSPLUSFLAGS" => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1",
          "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
      }
      s.dependency "React-Codegen"
      s.dependency "RCT-Folly"
      s.dependency "RCTRequired"
      s.dependency "RCTTypeSafety"
      s.dependency "ReactCommon/turbomodule/core"
    end
  end
end
