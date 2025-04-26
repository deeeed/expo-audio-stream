module.exports = {
  overrides: [
    {
      files: ['third_party/**/*.js'],
      parser: '@babel/eslint-parser',
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false
        }
      }
    }
  ]
}; 