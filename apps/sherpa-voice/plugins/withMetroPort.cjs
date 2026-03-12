/* eslint-disable @typescript-eslint/no-require-imports */
const { withGradleProperties, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Config plugin to set the Metro server port in gradle.properties
 * and override the react_native_dev_server_port Android resource.
 *
 * The resource override is needed because ReactAndroid ships a static
 * values.xml with port 8081, and library resources lose to app-level
 * resources during the Android resource merge.
 */
module.exports = function withMetroPort(config, { port = 7365 } = {}) {
  // 1. Set gradle.properties
  config = withGradleProperties(config, (config) => {
    const portString = port.toString();
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

  // 2. Write app-level resource override so it wins the merge against ReactAndroid's 8081
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const valuesDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "values"
      );
      fs.mkdirSync(valuesDir, { recursive: true });
      const resFile = path.join(valuesDir, "dev_server_port.xml");
      fs.writeFileSync(
        resFile,
        `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Override ReactAndroid default (8081) so dev launcher finds Metro on the right port -->
    <integer name="react_native_dev_server_port">${port}</integer>
</resources>
`
      );
      return config;
    },
  ]);

  return config;
}; 