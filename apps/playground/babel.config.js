module.exports = (api) => {
    api.cache(true)
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
                        // Add other aliases as needed
                    },
                },
            ],
            ['@babel/plugin-proposal-decorators', { 'legacy': true }],
            // plugin for transformerjs and worker support
            'babel-plugin-transform-import-meta',
            '@babel/plugin-transform-class-static-block',
        ],
        env: {
            production: {
                plugins: [
                    'react-native-paper/babel',
                    'react-native-reanimated/plugin',
                ],
            },
        },
    }
}
