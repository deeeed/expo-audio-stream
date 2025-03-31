module.exports = {
  dependencies: {
    '@siteed/sherpa-onnx.rn': {
      platforms: {
        ios: {
          podspecPath: __dirname + '/sherpa-onnx-rn.podspec',
          codegenConfig: {
            name: "SherpaOnnxSpec",
            type: "modules",
            ios: {
              generateModuleProvider: true
            }
          }
        },
        android: {
          sourceDir: __dirname + '/android',
          packageImportPath: 'import net.siteed.sherpaonnx.SherpaOnnxPackage;',
          packageInstance: 'new SherpaOnnxPackage()',
        },
      },
    },
  },
  // Enable codegen for the New Architecture
  codegenConfig: {
    name: "RNSherpaOnnxSpec",
    type: "modules",
    jsSrcsDir: "src",
  },
}; 