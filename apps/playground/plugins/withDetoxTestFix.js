// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withDetoxTestFix(config) {
  return withProjectBuildGradle(config, config => {
    // Add a global packagingOptions to the root project
    if (!config.modResults.contents.includes("packagingOptions.pickFirsts")) {
      // Add after the apply plugin line
      const applyPluginLine = 'apply plugin: "com.facebook.react.rootproject"';
      const packagingOptionsConfig = `
${applyPluginLine}

// Global packaging options to fix duplicate libc++_shared.so files
gradle.projectsEvaluated {
    allprojects {
        tasks.withType(com.android.build.gradle.internal.tasks.MergeNativeLibsTask) { task ->
            task.doFirst {
                // Force pickFirst for all projects
                task.packagingOptions.pickFirsts += 'lib/arm64-v8a/libc++_shared.so'
                task.packagingOptions.pickFirsts += 'lib/armeabi-v7a/libc++_shared.so'
                task.packagingOptions.pickFirsts += 'lib/x86/libc++_shared.so'
                task.packagingOptions.pickFirsts += 'lib/x86_64/libc++_shared.so'
            }
        }
    }
}`;

      config.modResults.contents = config.modResults.contents.replace(
        applyPluginLine,
        packagingOptionsConfig
      );
    }
    
    return config;
  });
}; 