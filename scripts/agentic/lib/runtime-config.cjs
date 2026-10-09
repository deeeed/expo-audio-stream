const path = require('node:path');
const resolveMetroPort = (env, fallback) => Number.parseInt(env.METRO_PORT || env.WATCHER_PORT || String(fallback), 10);
const appRootFor = (root, app = process.env.AUDIOLAB_APP || 'playground') => path.join(root, 'apps', app);
module.exports = { resolveMetroPort, appRootFor };
if (require.main === module) {
  console.log(process.argv[2] === 'app-root'
    ? appRootFor(process.argv[3])
    : resolveMetroPort(process.env, process.argv[2]));
}
