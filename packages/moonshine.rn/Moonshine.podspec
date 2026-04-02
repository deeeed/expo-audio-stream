require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'Moonshine'
  s.version      = package['version']
  s.summary      = package['description']
  s.homepage     = 'https://github.com/deeeed/audiolab'
  s.license      = package['license']
  s.authors      = package['author']
  s.platforms    = { :ios => '15.0' }
  s.source       = { :git => 'https://github.com/deeeed/audiolab.git', :tag => s.version.to_s }
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.swift_version = '5.0'

  s.dependency 'React-Core'
end
