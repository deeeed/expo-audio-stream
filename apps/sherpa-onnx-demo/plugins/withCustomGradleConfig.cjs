/* eslint-disable @typescript-eslint/no-require-imports */
const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Align Kotlin JVM target with Java 17 across all subprojects.
 * Required because @pchmn/expo-material3-theme (transitive dep of
 * @siteed/design-system) uses Kotlin that may default to JVM 21.
 * Copied from apps/playground/plugins/withCustomGradleConfig.cjs.
 */
module.exports = function withCustomGradleConfig(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('jvmTarget')) {
      return config;
    }

    const jvmConfig = `

    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).all {
        kotlinOptions {
            jvmTarget = "17"
        }
    }

    tasks.withType(JavaCompile).configureEach {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }`;

    // Inject into the existing allprojects block
    const allProjectsRegex = /allprojects\s*\{/;
    const match = allProjectsRegex.exec(config.modResults.contents);

    if (match) {
      const blockStart = match.index + match[0].length;
      const blockEnd = findClosingBrace(config.modResults.contents, blockStart);
      if (blockEnd !== -1) {
        const existingBlock = config.modResults.contents.substring(blockStart, blockEnd);
        config.modResults.contents =
          config.modResults.contents.substring(0, match.index) +
          `allprojects {${existingBlock}\n${jvmConfig}\n}` +
          config.modResults.contents.substring(blockEnd + 1);
      }
    }

    return config;
  });
};

function findClosingBrace(str, startIndex) {
  let braceCount = 1;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '{') braceCount++;
    if (str[i] === '}') braceCount--;
    if (braceCount === 0) return i;
  }
  return -1;
}
