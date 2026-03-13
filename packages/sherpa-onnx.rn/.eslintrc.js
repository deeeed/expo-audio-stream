module.exports = {
  ignorePatterns: ['third_party/', 'lib/'],
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