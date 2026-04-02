require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'Moonshine'
  s.version      = package['version']
  s.summary      = package['description']
  s.homepage     = 'https://github.com/deeeed/audiolab'
  s.license      = package['license']
  s.authors      = package['author']
  s.platforms    = { :ios => '15.1' }
  s.source       = { :git => 'https://github.com/deeeed/audiolab.git', :tag => s.version.to_s }
  s.source_files = 'ios/**/*.{h,m,mm}'
  s.vendored_frameworks = 'prebuilt/ios/Moonshine.xcframework'
  s.frameworks = 'CoreFoundation', 'Foundation'
  s.libraries = 'c++'
  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'DEFINES_MODULE' => 'YES'
  }

  s.dependency 'React-Core'
end
