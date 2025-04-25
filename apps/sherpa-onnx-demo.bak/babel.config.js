module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@assets': './assets',
            'react-native-vector-icons': '@expo/vector-icons',
          },
        },
      ],
      ['@babel/plugin-proposal-decorators', { 'legacy': true }],
      // plugin for transformerjs and worker support
      'babel-plugin-transform-import-meta',
    ],
    env: {
      production: {
        plugins: [
          'react-native-reanimated/plugin',
        ],
      },
    },
  };
}; 