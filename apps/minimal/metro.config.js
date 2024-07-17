/* eslint-disable no-undef */
// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  ...Array.from(config.resolver.blockList ?? []),
  new RegExp(path.resolve("..", "node_modules", "react")),
  // new RegExp(path.resolve("..", "node_modules", "react-native")),
];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "./node_modules"),
  // path.resolve(__dirname, "../node_modules"),
];

module.exports = config;
