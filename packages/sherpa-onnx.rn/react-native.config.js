module.exports = {
  dependencies: {
    '@siteed/sherpa-onnx.rn': {
      platforms: {
        ios: {
          podspecPath: __dirname + '/sherpa-onnx-rn.podspec',
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
    name: "SherpaOnnx",
    type: "modules",
    jsSrcsDir: "src",
  },
}; 