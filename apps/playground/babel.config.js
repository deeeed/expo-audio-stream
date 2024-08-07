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
                        // Add other aliases as needed
                    },
                },
            ],
            // plugin for transformerjs and worker support
            'babel-plugin-transform-import-meta',
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
