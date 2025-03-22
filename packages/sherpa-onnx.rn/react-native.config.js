module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import net.siteed.sherpaonnx.SherpaOnnxPackage;',
        packageInstance: 'new SherpaOnnxPackage()',
      },
      ios: {
        // iOS configuration will be added later
      },
    },
  },
}; 