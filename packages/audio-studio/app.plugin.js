// Plugin for app.json usage (regular Node.js context)
const plugin = require('./plugin/build/index.js')
module.exports = plugin.default || plugin
