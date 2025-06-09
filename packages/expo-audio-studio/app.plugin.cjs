// only here for ts-node and projects using app.config.ts instead of app.json.

// Plugin fallback for ts-node and projects using app.config.ts instead of app.json.
try {
    const plugin = require('./plugin/build/index.cjs')
    module.exports = plugin.default || plugin
} catch (buildError) {
    console.warn('[@siteed/expo-audio-studio] Plugin build not found, using no-op fallback. Run `yarn build:plugin`')
    module.exports = (config) => config
}
