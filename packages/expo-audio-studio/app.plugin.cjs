// only here for ts-node and projects using app.config.ts instead of app.json.
try {
    // Export the plugin from its CommonJS build
    module.exports = require('./plugin/build/')
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
