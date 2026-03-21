/* eslint-disable @typescript-eslint/no-require-imports */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PROGUARD_RULES = `
# Keep Apache Commons Compress — used by sherpa-onnx.rn for tar.bz2 extraction.
# R8 renames these classes; Class.forName() in SherpaOnnxImpl then throws
# ClassNotFoundException and sets isLibraryLoaded=false, blocking all extraction.
-keep class org.apache.commons.compress.** { *; }

# Keep sherpa-onnx JNI and module classes
-keep class com.k2fsa.sherpa.onnx.** { *; }
-keep class net.siteed.sherpaonnx.** { *; }
`;

module.exports = function withProguardRules(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const proguardFile = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );

      if (fs.existsSync(proguardFile)) {
        const existing = fs.readFileSync(proguardFile, 'utf8');
        if (!existing.includes('org.apache.commons.compress')) {
          fs.appendFileSync(proguardFile, PROGUARD_RULES);
        }
      }

      return config;
    },
  ]);
};
