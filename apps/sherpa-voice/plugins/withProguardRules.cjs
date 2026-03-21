/* eslint-disable @typescript-eslint/no-require-imports */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PROGUARD_RULES = `
# Keep Apache Commons Compress classes used for tar.bz2 extraction.
# R8 renames these; Class.forName() in SherpaOnnxImpl throws ClassNotFoundException
# and sets isLibraryLoaded=false even though the JNI .so loaded successfully.
# Only keep tar/bzip2/utils — NOT the optional XZ/Zstd/pack200 codecs which
# reference missing optional deps (org.tukaani.xz, com.github.luben.zstd, asm).
-keep class org.apache.commons.compress.archivers.tar.** { *; }
-keep class org.apache.commons.compress.compressors.bzip2.** { *; }
-keep class org.apache.commons.compress.compressors.CompressorStreamFactory { *; }
-keep class org.apache.commons.compress.utils.** { *; }
# Suppress warnings for optional dependencies not included in the Android build
-dontwarn org.tukaani.xz.**
-dontwarn com.github.luben.zstd.**
-dontwarn org.objectweb.asm.**
-dontwarn org.apache.commons.compress.harmony.**
-dontwarn org.apache.commons.compress.compressors.zstandard.**
-dontwarn org.apache.commons.compress.compressors.lzma.**
-dontwarn org.apache.commons.compress.compressors.xz.**
-dontwarn org.apache.commons.compress.archivers.sevenz.**

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
