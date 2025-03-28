module.exports = {
  dependency: {
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
        libraryName: 'sherpaonnx'
      },
    },
  },
}; 