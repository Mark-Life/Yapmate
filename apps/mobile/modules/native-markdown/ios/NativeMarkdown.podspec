Pod::Spec.new do |s|
  s.name           = 'NativeMarkdown'
  s.version        = '1.0.0'
  s.summary        = 'Native iOS markdown renderer for streaming content'
  s.description    = 'High-performance markdown renderer using Down library for native iOS rendering'
  s.author         = 'yapmate'
  s.homepage       = 'https://yapmate.ai'
  s.platforms      = { :ios => '15.0' }
  s.source         = { :git => '' }
  s.swift_version  = '5.0'
  s.source_files   = '**/*.swift'

  s.dependency 'ExpoModulesCore'
  s.dependency 'Down', '~> 0.11'
end
