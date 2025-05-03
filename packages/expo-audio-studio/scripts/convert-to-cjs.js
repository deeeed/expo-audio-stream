// Simple script to convert ESM to CommonJS
const fs = require('fs')
const path = require('path')

// Get the directory path
const currentFilePath = process.argv[1]
const currentDir = path.dirname(currentFilePath)
const pluginDir = path.join(currentDir, '..', 'plugin', 'build')
const esm = path.join(pluginDir, 'index.js')
const cjs = path.join(pluginDir, 'index.cjs')

// Read the ESM file
let content = fs.readFileSync(esm, 'utf8')

// Convert ES import to CommonJS require
content = content.replace(
    /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g,
    'const {$1} = require("$2")'
)

// Convert ES import to CommonJS require for default imports
content = content.replace(
    /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
    'const $1 = require("$2")'
)

// Change export default to module.exports =
content = content.replace(/export\s+default\s+(\w+)/, 'module.exports = $1')

// Write the CommonJS file
fs.writeFileSync(cjs, content)

console.log('Successfully converted plugin to CommonJS format')
