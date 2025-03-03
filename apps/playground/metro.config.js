/* eslint-disable @typescript-eslint/no-require-imports */
// Learn more https://docs.expo.io/guides/customizing-metro
const escape = require('escape-string-regexp')
const { getDefaultConfig } = require('expo/metro-config')
const exclusionList = require('metro-config/src/defaults/exclusionList')
const path = require('node:path')

const pakLib = require('../../packages/expo-audio-stream/package.json')
const pakUI = require('../../packages/expo-audio-ui/package.json')

// Find the project and workspace directories
const projectRoot = __dirname
// This can be replaced with `find-yarn-workspace-root`
const monorepoRoot = path.resolve(projectRoot, '../..')
const uiRoot = path.resolve(monorepoRoot, 'packages/expo-audio-ui')
const libRoot = path.resolve(monorepoRoot, 'packages/expo-audio-stream')

const modules = [
    'react-native-paper',
    'react-native-safe-area-context',
    'react-native-reanimated',
    '@siteed/expo-audio-ui',
    '@siteed/expo-audio-stream',
    'react-dom',
    'react',
    'react-native',
    '@xenova/transformers',
    ...Object.keys({ ...pakUI.peerDependencies }),
    ...Object.keys({ ...pakLib.peerDependencies }),
]

const extraNodeModules = modules.reduce((acc, name) => {
    acc[name] = path.join(__dirname, 'node_modules', name)
    return acc
}, {})

// Prevent metro from resolving duplicate packages
const blacklistRE = exclusionList(
    modules
        .map(
            (m) =>
                new RegExp(
                    `^${escape(path.join(uiRoot, 'node_modules', m))}\\/.*$`
                )
        )
        .concat(
            modules.map(
                (m) =>
                    new RegExp(
                        `^${escape(path.join(libRoot, 'node_modules', m))}\\/.*$`
                    )
            )
        )
)

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot]

config.server.port = 7365

config.transformer = {
    ...config.transformer,
    getTransformOptions: async () => ({
        transform: {
            experimentalImportSupport: false,
            inlineRequires: true,
        },
    }),
    assetPlugins: config.transformer.assetPlugins || [],
}

config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
]

config.resolver = {
    ...config.resolver,
    extraNodeModules,
    blacklistRE,
    sourceExts: [...config.resolver.sourceExts, 'cjs', 'mjs'],
    assetExts: [
        ...config.resolver.assetExts,
        'wasm',
        'ttf',
        'bin',
        'mil',
        'wav',
        'opus',
        'mp3',
        'm4a',
        'tflite',
        'pt',
        'pb',
        'json',
        'bin',
        'ogg',
        'flac',
        'aac',
        'pte',
        'onnx',
        'webm',
        'm4b',
    ],
    resolveRequest: (context, moduleName, platform) => {
        if (moduleName === '@siteed/expo-audio-ui') {
            return {
                filePath: monorepoRoot + '/packages/expo-audio-ui/src/index.ts',
                type: 'sourceFile',
            }
        } else if (moduleName === '@siteed/expo-audio-stream') {
            return {
                filePath:
                    monorepoRoot + '/packages/expo-audio-stream/src/index.ts',
                type: 'sourceFile',
            }
            // } else if (moduleName === "react" || moduleName === "react-dom") {
            //     // console.log(
            //     //   `Resolving ${moduleName} to ${path.resolve(projectRoot, `node_modules/${moduleName}`)}`,
            //     // );
            //     // Force resolution to the local versions specified in extraNodeModules
            //     return {
            //       filePath: path.resolve(
            //         projectRoot,
            //         `node_modules/${moduleName}/index.js`,
            //       ),
            //       type: "sourceFile",
            //     };
        }
        // Ensure you call the default resolver.
        return context.resolveRequest(context, moduleName, platform)
    },
}

module.exports = config
