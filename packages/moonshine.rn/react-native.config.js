module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import net.siteed.moonshine.MoonshinePackage;',
        packageInstance: 'new MoonshinePackage()',
      },
      ios: {},
    },
  },
};
