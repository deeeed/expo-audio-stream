// This is a CommonJS file (.cjs) which loads the plugin configuration
try {
    // Export the plugin from its CommonJS build
    module.exports = require('./plugin/build/index.cjs')
} catch (error) {
    console.error(
        '[@siteed/expo-audio-studio] Plugin loading error:',
        error.message
    )
    // Fallback plugin that does nothing but logs error
    module.exports = (config) => {
        console.warn('[@siteed/expo-audio-studio] Using fallback plugin due to loading error. Run `yarn build` in the package directory.')
        return config
    }
}
