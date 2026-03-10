module.exports = {
  dependency: {
    platforms: {
      ios: {
        podspecPath: __dirname + '/sherpa-onnx-rn.podspec',
      },
      android: {
        packageImportPath: 'import net.siteed.sherpaonnx.SherpaOnnxPackage;',
        packageInstance: 'new SherpaOnnxPackage()',
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
