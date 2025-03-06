module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import net.siteed.essentia.EssentiaPackage;',
        packageInstance: 'new EssentiaPackage()',
      },
      ios: {
        // Add iOS configuration if applicable
      },
    },
  },
};
