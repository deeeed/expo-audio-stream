#!/usr/bin/env node

// Simple script to fix CommonJS exports
const fs = require('fs');
const path = require('path');

// Path to the CJS output file
const cjsFilePath = path.resolve('./plugin/build/cjs/index.js');

console.log('📝 Processing CommonJS output...');

try {
  let content = fs.readFileSync(cjsFilePath, 'utf8');
  
  // Replace exports.default with module.exports
  content = content.replace(/exports\.default = (\w+);/, 'module.exports = $1;');
  
  // Make sure there's no duplicate module.exports
  if (!content.includes('module.exports =')) {
    // Add module.exports if it doesn't exist
    const lastExportLine = content.lastIndexOf('exports.default =');
    if (lastExportLine !== -1) {
      const withRecordingPermissionName = content.match(/exports\.default = (\w+);/)[1];
      content = content.replace(/exports\.default = (\w+);/, 
        `module.exports = ${withRecordingPermissionName};\n// For backwards compatibility\nexports.default = ${withRecordingPermissionName};`);
    }
  }
  
  fs.writeFileSync(cjsFilePath, content);
  console.log('✅ Successfully updated CommonJS exports in:', cjsFilePath);
} catch (error) {
  console.error('❌ Error processing CommonJS output:', error.message);
  process.exit(1);
} 