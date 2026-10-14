// Expo 57 start/run/export explicitly choose .expo/dev/logs despite LOG_EVENTS.
// Initialize its existing logger first; its later initialization is idempotent.
const path = require('node:path');
const { createRequire } = require('node:module');
const entry = (process.argv[1] || '').replaceAll('\\', '/');
if (process.env.LOG_EVENTS && /(?:expo\/bin\/cli|@expo\/cli\/build\/bin\/cli)(?:\.js)?$/.test(entry)) {
  const appRequire = createRequire(path.join(process.cwd(), 'package.json'));
  const root = path.dirname(appRequire.resolve('@expo/cli/package.json'));
  appRequire(path.join(root, 'build/src/events/index.js')).installEventLogger(process.env.LOG_EVENTS);
}
