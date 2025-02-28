// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withProjectBuildGradle } = require('@expo/config-plugins')

module.exports = function withCustomGradleConfig(config) {
    return withProjectBuildGradle(config, (config) => {
        if (config.modResults.contents.includes('jvmTarget')) {
            return config // If it's already configured, skip
        }

        const newConfigurations = `
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).all {
        kotlinOptions {
            jvmTarget = "17"  // Ensure Kotlin targets JVM 17
        }
    }

    tasks.withType(JavaCompile).configureEach {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }`

        // Check if the file already has the gradle.projectsEvaluated block from withDetoxTestFix
        if (config.modResults.contents.includes('gradle.projectsEvaluated')) {
            // We need to find the main allprojects block, not the one inside gradle.projectsEvaluated
            const allProjectsRegex = /allprojects\s*\{(?!\s*tasks\.withType\(com\.android\.build\.gradle)/g;
            const matches = [...config.modResults.contents.matchAll(allProjectsRegex)];
            
            // Find the main allprojects block (not the one inside gradle.projectsEvaluated)
            const mainAllProjectsMatch = matches.find(match => {
                const blockStart = match.index + match[0].length;
                const blockText = config.modResults.contents.substring(blockStart, blockStart + 100);
                return blockText.includes('repositories') || blockText.includes('maven');
            });
            
            if (mainAllProjectsMatch) {
                const blockStart = mainAllProjectsMatch.index + mainAllProjectsMatch[0].length;
                const blockEnd = findClosingBrace(config.modResults.contents, blockStart);
                
                if (blockEnd !== -1) {
                    const existingBlock = config.modResults.contents.substring(blockStart, blockEnd);
                    const updatedAllProjects = `allprojects {${existingBlock}
${newConfigurations}
}`;
                    config.modResults.contents = 
                        config.modResults.contents.substring(0, mainAllProjectsMatch.index) +
                        updatedAllProjects +
                        config.modResults.contents.substring(blockEnd + 1);
                }
            } else {
                // If we can't find the main allprojects block, add a new one after gradle.projectsEvaluated
                const gradleEvalBlock = /gradle\.projectsEvaluated\s*\{[\s\S]*?\}\s*\}/g;
                const gradleEvalMatch = gradleEvalBlock.exec(config.modResults.contents);
                
                if (gradleEvalMatch) {
                    const blockEnd = gradleEvalMatch.index + gradleEvalMatch[0].length;
                    
                    config.modResults.contents = 
                        config.modResults.contents.substring(0, blockEnd) +
                        `

allprojects {
    repositories {
        // Repositories will be added by React Native
    }
${newConfigurations}
}` +
                        config.modResults.contents.substring(blockEnd);
                }
            }
        } else {
            // Original behavior when there's no gradle.projectsEvaluated block
            const allProjectsRegex = /allprojects\s*\{/g;
            const match = allProjectsRegex.exec(config.modResults.contents);

            if (match) {
                // If allprojects block exists, append new configurations to it
                const blockStart = match.index + match[0].length;
                const blockEnd = findClosingBrace(config.modResults.contents, blockStart);

                if (blockEnd !== -1) {
                    const existingBlock = config.modResults.contents.substring(blockStart, blockEnd);
                    const updatedAllProjects = `allprojects {${existingBlock}
${newConfigurations}
}`;
                    config.modResults.contents =
                        config.modResults.contents.substring(0, match.index) +
                        updatedAllProjects +
                        config.modResults.contents.substring(blockEnd + 1);
                }
            } else {
                // If allprojects block doesn't exist, append a new one
                config.modResults.contents += `

allprojects {
${newConfigurations}
}`;
            }
        }

        return config;
    });
}

// Function to find the matching closing brace
function findClosingBrace(str, startIndex) {
    let braceCount = 1
    for (let i = startIndex; i < str.length; i++) {
        if (str[i] === '{') braceCount++
        if (str[i] === '}') braceCount--
        if (braceCount === 0) return i
    }
    return -1
}

// FIXME: it creates the below instead of adding to existing allProjects block

// // Top-level build file where you can add configuration options common to all sub-projects/modules.

// buildscript {
//     ext {
//         buildToolsVersion = findProperty('android.buildToolsVersion') ?: '34.0.0'
//         minSdkVersion = Integer.parseInt(findProperty('android.minSdkVersion') ?: '23')
//         compileSdkVersion = Integer.parseInt(findProperty('android.compileSdkVersion') ?: '34')
//         targetSdkVersion = Integer.parseInt(findProperty('android.targetSdkVersion') ?: '34')
//         kotlinVersion = findProperty('android.kotlinVersion') ?: '1.9.23'

//         ndkVersion = "26.1.10909125"
//     }
//     repositories {
//         google()
//         mavenCentral()
//     }
//     dependencies {
//         classpath('com.android.tools.build:gradle')
//         classpath('com.facebook.react:react-native-gradle-plugin')
//         classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
//     }
// }

// apply plugin: "com.facebook.react.rootproject"

// allprojects {
//     repositories {
//         maven {
//             // All of React Native (JS, Obj-C sources, Android binaries) is installed from npm
//             url(new File(['node', '--print', "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim(), '../android'))
//         }
//         maven {
//             // Android JSC is installed from npm
//             url(new File(['node', '--print', "require.resolve('jsc-android/package.json', { paths: [require.resolve('react-native/package.json')] })"].execute(null, rootDir).text.trim(), '../dist'))
//         }

//         google()
//         mavenCentral()
//         maven { url 'https://www.jitpack.io' }
//     }
// }

// allprojects {
//     tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).all {
//         kotlinOptions {
//             jvmTarget = "17"  // Ensure Kotlin targets JVM 17
//         }
//     }

//     java {
//         toolchain {
//             languageVersion.set(JavaLanguageVersion.of(17))  // Ensure Java uses JVM 17 globally
//         }
//     }

//     tasks.withType(JavaCompile).configureEach {
//         sourceCompatibility = JavaVersion.VERSION_17
//         targetCompatibility = JavaVersion.VERSION_17
//     }
// }
