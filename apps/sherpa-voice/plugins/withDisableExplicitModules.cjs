// Xcode 26 workaround: disable Swift explicit modules on the main app target
// to avoid "ambiguous implicit access level for import" errors.
// The Podfile post_install already handles Pods targets; this covers the app.
const { withXcodeProject } = require('expo/config-plugins');

module.exports = function withDisableExplicitModules(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const buildConfigs = project.hash.project.objects['XCBuildConfiguration'];
    for (const key in buildConfigs) {
      if (typeof buildConfigs[key] === 'object' && buildConfigs[key].buildSettings) {
        buildConfigs[key].buildSettings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO';
      }
    }
    return config;
  });
};
