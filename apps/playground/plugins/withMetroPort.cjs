/* eslint-disable @typescript-eslint/no-require-imports */
const { withGradleProperties } = require("@expo/config-plugins");

/**
 * Config plugin to set the Metro server port in gradle.properties
 * @param {import("@expo/config-plugins").ConfigPlugin.ConfigProps} config
 * @param {Object} options - Plugin options
 * @param {number} [options.port=4765] - The Metro server port to use
 * @returns {import("@expo/config-plugins").ConfigPlugin.ConfigProps}
 */
module.exports = function withMetroPort(config, { port = 7365 } = {}) {
  return withGradleProperties(config, (config) => {
    // Make sure port is a string
    const portString = port.toString();
    
    // Add or update the reactNativeDevServerPort property
    config.modResults = config.modResults.filter(
      (item) => item.type !== "property" || item.key !== "reactNativeDevServerPort"
    );
    
    config.modResults.push({
      type: "property",
      key: "reactNativeDevServerPort",
      value: portString,
    });
    
    return config;
  });
}; 