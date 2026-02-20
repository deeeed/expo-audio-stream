#!/bin/bash
# Trigger a bundle reload on all connected clients via Metro's WebSocket API.
#
# Usage: scripts/agentic/reload-metro.sh
#
# Environment:
#   WATCHER_PORT   Metro port (default: 7365)

set -euo pipefail

PORT="${WATCHER_PORT:-7365}"

# Verify Metro is running
if ! curl -sf "http://localhost:${PORT}/status" >/dev/null 2>&1; then
  echo "ERROR: Metro is not running on port $PORT."
  exit 1
fi

# Reload connected clients via CDP Page.reload on the inspector WebSocket.
# The /message endpoint doesn't trigger client reloads — Page.reload does.
node -e "
const WebSocket = require('ws');

fetch('http://localhost:${PORT}/json/list')
  .then(r => r.json())
  .then(targets => {
    // Accept any React Native target (description varies: 'Bridgeless', 'React Native', etc.)
    // Fall back to all targets with a webSocketDebuggerUrl if no RN-specific ones found.
    let rnTargets = targets.filter(t => t.reactNative);
    if (rnTargets.length === 0) rnTargets = targets.filter(t => t.webSocketDebuggerUrl);
    if (rnTargets.length === 0) {
      console.error('ERROR: No connected clients found. Is the app open and connected to Metro?');
      process.exit(1);
    }
    let done = 0;
    for (const target of rnTargets) {
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Page.reload' }));
        console.log('Reload sent to: ' + target.title);
        setTimeout(() => {
          ws.close();
          if (++done === rnTargets.length) process.exit(0);
        }, 1000);
      };
      ws.onerror = (e) => {
        console.error('WebSocket error for ' + target.title + ':', e.message || e);
        if (++done === rnTargets.length) process.exit(1);
      };
    }
  })
  .catch(e => {
    console.error('ERROR: Failed to fetch targets:', e.message);
    process.exit(1);
  });
"
