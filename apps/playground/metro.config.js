/* eslint-disable no-undef */
// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const config = getDefaultConfig(__dirname);

// Find the project and workspace directories
const projectRoot = __dirname;
// This can be replaced with `find-yarn-workspace-root`
const monorepoRoot = path.resolve(projectRoot, "../..");
const expoAudioStream = path.resolve(
  monorepoRoot,
  "packages/expo-audio-stream",
);

// npm v7+ will install ../node_modules/react and ../node_modules/react-native because of peerDependencies.
// To prevent the incompatible react-native bewtween ./node_modules/react-native and ../node_modules/react-native,
// excludes the one from the parent folder when bundling.
config.resolver.blockList = [
  ...Array.from(config.resolver.blockList ?? []),
  new RegExp(path.resolve("..", "node_modules", "react")),
  new RegExp(path.resolve("..", "node_modules", "react-native")),
];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "./node_modules"),
  path.resolve(__dirname, "../node_modules"),
];

config.resolver.assetExts.push(
  // Adds support for `.wasm` files for WebAssembly
  "wasm",
);

config.resolver.extraNodeModules = {
  "expo-audio-stream": "../../packages/expo-audio-stream/",
};

config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    "expo-audio-stream": path.resolve(
      __dirname,
      "../../packages/expo-audio-stream",
    ),
  },
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName.startsWith("@siteed/expo-audio-stream")) {
      // Logic to resolve the module name to a file path...
      // NOTE: Throw an error if there is no resolution.
      return {
        filePath: expoAudioStream + "/src/index.ts",
        type: "sourceFile",
      };
    } else if (moduleName === "react" || moduleName === "react-dom") {
      console.log(
        `Resolving ${moduleName} to ${path.resolve(projectRoot, `node_modules/${moduleName}`)}`,
      );
      // Force resolution to the local versions specified in extraNodeModules
      return {
        filePath: path.resolve(
          projectRoot,
          `node_modules/${moduleName}/index.js`,
        ),
        type: "sourceFile",
      };
    }
  },
};

config.watchFolders = [path.resolve(__dirname, "..")];

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
