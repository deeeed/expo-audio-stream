#!/usr/bin/env node
/**
 * CDP Bridge — interact with the running Expo Audio Studio playground app
 * via the Hermes Chrome DevTools Protocol.
 *
 * Adapted from MetaMask Mobile's scripts/agentic/cdp-bridge.js for Expo Router.
 *
 * Usage:
 *   node scripts/agentic/cdp-bridge.js <command> [args...]
 *
 * Commands:
 *   navigate <path>                    Navigate to a route (Expo Router path)
 *   get-route                          Get current route path
 *   get-state                          Get audio recorder state
 *   eval <expression>                  Evaluate arbitrary JS in app context
 *   can-go-back                        Check if navigation can go back
 *   go-back                            Navigate back
 *
 * Environment:
 *   WATCHER_PORT    Metro port (default: 8110)
 *   CDP_TIMEOUT     Connection timeout in ms (default: 5000)
 *   IOS_SIMULATOR   Filter targets by iOS simulator name
 *   ANDROID_DEVICE  Filter targets by Android device/emulator serial
 */

'use strict';

const http = require('http');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function loadPort() {
  return parseInt(process.env.WATCHER_PORT || '8110', 10);
}

// ---------------------------------------------------------------------------
// Target discovery
// ---------------------------------------------------------------------------

/**
 * Fetch the list of debuggable targets from the Hermes inspector.
 * Expo/Metro exposes them at /json/list on the Metro port.
 */
function fetchTargets(port) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:${port}/json/list`;
    http
      .get(url, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(
              new Error(`Failed to parse /json/list response: ${e.message}`)
            );
          }
        });
      })
      .on('error', (err) => {
        reject(
          new Error(
            `Cannot reach Metro at localhost:${port}. Is the app running?\n` +
              `  Start it with: scripts/agentic/start-metro.sh\n` +
              `  Error: ${err.message}`
          )
        );
      });
  });
}

/**
 * Probe a WebSocket target to see if it has __AGENTIC__ installed.
 * Returns true if the bridge is available, false otherwise.
 */
async function probeTarget(wsUrl) {
  try {
    const client = await createWSClient(wsUrl, 2000);
    try {
      const result = await cdpEval(
        client,
        'typeof globalThis.__AGENTIC__ !== "undefined"'
      );
      return result === true;
    } finally {
      client.close();
    }
  } catch {
    return false;
  }
}

/**
 * Discover the best WebSocket debug target.
 * Filters by simulator/device name when env vars are set,
 * then probes candidates for the __AGENTIC__ bridge.
 */
async function discoverTarget(port) {
  const targets = await fetchTargets(port);

  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error(
      'No debug targets found. Make sure the app is running and connected to Metro.'
    );
  }

  // Filter to targets that have a WebSocket debugger URL
  let candidates = targets.filter((t) => t.webSocketDebuggerUrl);

  // Filter by iOS simulator name if set
  const simName = process.env.IOS_SIMULATOR || '';
  if (simName && candidates.length > 1) {
    const filtered = candidates.filter((t) => t.deviceName === simName);
    if (filtered.length > 0) {
      candidates = filtered;
    }
  }

  // Filter by Android device name if set
  const androidDevice = process.env.ANDROID_DEVICE || '';
  if (androidDevice && candidates.length > 1) {
    const filtered = candidates.filter((t) => t.deviceName === androidDevice);
    if (filtered.length > 0) {
      candidates = filtered;
    }
  }

  if (candidates.length === 0) {
    candidates = targets.filter((t) => t.webSocketDebuggerUrl);
  }

  if (candidates.length === 0) {
    throw new Error(
      `No suitable debug target found. Targets:\n${JSON.stringify(targets, null, 2)}`
    );
  }

  // Sort by page number descending (JS runtime has higher page number than C++ native)
  candidates.sort((a, b) => {
    const aPage = Number.parseInt((a.id || '').split('-').pop() || '0', 10);
    const bPage = Number.parseInt((b.id || '').split('-').pop() || '0', 10);
    return bPage - aPage;
  });

  // Probe candidates to find the one with __AGENTIC__ installed (the JS runtime)
  for (const candidate of candidates) {
    const hasAgentic = await probeTarget(candidate.webSocketDebuggerUrl);
    if (hasAgentic) {
      return candidate.webSocketDebuggerUrl;
    }
  }

  // Fallback: return highest page number (most likely the JS runtime)
  return candidates[0].webSocketDebuggerUrl;
}

// ---------------------------------------------------------------------------
// WebSocket CDP client
// ---------------------------------------------------------------------------

/**
 * Minimal CDP client using WebSocket.
 * Node 22+ has a built-in WebSocket; for older versions we use the ws package
 * that ships with React Native / Metro dev dependencies.
 */
function createWSClient(wsUrl, timeout) {
  return new Promise((resolve, reject) => {
    let WebSocketImpl;
    // Node 22+ has globalThis.WebSocket
    if (typeof globalThis.WebSocket === 'function') {
      WebSocketImpl = globalThis.WebSocket;
    } else {
      try {
        // Dynamic require — ws is an optional fallback for Node < 22
        const wsModule = 'ws';
        WebSocketImpl = require(wsModule);
      } catch {
        throw new Error(
          'WebSocket not available. Install "ws" package or use Node >= 22.'
        );
      }
    }

    const ws = new WebSocketImpl(wsUrl);
    let msgId = 0;
    const pending = new Map();

    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`CDP connection timeout after ${timeout}ms`));
    }, timeout);

    ws.onopen = () => {
      clearTimeout(timer);
      resolve({
        /** Send a CDP command and wait for the response */
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const id = ++msgId;
            pending.set(id, { resolve: res, reject: rej });
            const msg = JSON.stringify({ id, method, params });
            ws.send(msg);
          });
        },
        close() {
          ws.close();
        },
      });
    };

    ws.onmessage = (evt) => {
      const data =
        typeof evt.data === 'string' ? evt.data : evt.data.toString();
      let msg;
      try {
        msg = JSON.parse(data);
      } catch {
        return;
      }
      if (msg.id && pending.has(msg.id)) {
        const { resolve: res, reject: rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) {
          rej(new Error(`CDP error: ${JSON.stringify(msg.error)}`));
        } else {
          res(msg.result);
        }
      }
    };

    ws.onerror = (err) => {
      clearTimeout(timer);
      reject(new Error(`WebSocket error: ${err.message || err}`));
    };

    ws.onclose = () => {
      clearTimeout(timer);
      for (const [, { reject: rej }] of pending) {
        rej(new Error('WebSocket closed'));
      }
      pending.clear();
    };
  });
}

// ---------------------------------------------------------------------------
// CDP evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a JS expression in the app's Hermes runtime via CDP Runtime.evaluate.
 * Returns the evaluated value (primitives and JSON-serialisable objects).
 */
async function cdpEval(client, expression) {
  const wrapped = `(function() { return (${expression}); })()`;
  const result = await client.send('Runtime.evaluate', {
    expression: wrapped,
    returnByValue: true,
    awaitPromise: false,
    generatePreview: false,
  });

  if (result.exceptionDetails) {
    const desc =
      result.exceptionDetails.exception?.description ||
      result.exceptionDetails.text ||
      JSON.stringify(result.exceptionDetails);
    throw new Error(`Evaluation error: ${desc}`);
  }

  return result.result?.value;
}

// ---------------------------------------------------------------------------
// Commands — adapted for Expo Router (URL-based navigation)
// ---------------------------------------------------------------------------

const COMMANDS = {
  async navigate(client, args) {
    const routePath = args[0];
    if (!routePath) {
      throw new Error('Usage: navigate <path>  (e.g. /(tabs)/record, /minimal)');
    }

    const expr = `globalThis.__AGENTIC__?.navigate(${JSON.stringify(routePath)})`;
    await cdpEval(client, expr);

    // Small delay for navigation to settle, then return current route
    await new Promise((r) => setTimeout(r, 500));
    const route = await cdpEval(client, 'globalThis.__AGENTIC__?.getRoute()');
    return { navigated: routePath, currentRoute: route };
  },

  async 'get-route'(client) {
    return await cdpEval(client, 'globalThis.__AGENTIC__?.getRoute()');
  },

  async 'get-state'(client) {
    return await cdpEval(client, 'globalThis.__AGENTIC__?.getState()');
  },

  async eval(client, args) {
    const expression = args.join(' ');
    if (!expression) {
      throw new Error('Usage: eval <expression>');
    }
    return await cdpEval(client, expression);
  },

  async 'can-go-back'(client) {
    return await cdpEval(client, 'globalThis.__AGENTIC__?.canGoBack()');
  },

  async 'go-back'(client) {
    await cdpEval(client, 'globalThis.__AGENTIC__?.goBack()');
    await new Promise((r) => setTimeout(r, 300));
    const route = await cdpEval(client, 'globalThis.__AGENTIC__?.getRoute()');
    return { currentRoute: route };
  },
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`CDP Bridge — interact with the running Expo Audio Studio app via Hermes CDP

Usage:
  node scripts/agentic/cdp-bridge.js <command> [args...]

Commands:
  navigate <path>         Navigate to a route (Expo Router URL path)
  get-route               Get current route path
  get-state               Get audio recorder state (isRecording, isPaused, durationMs, etc.)
  eval <expression>       Evaluate arbitrary JS in app context
  can-go-back             Check if navigation can go back
  go-back                 Navigate back

Routes:
  /(tabs)/record          Record tab (default)
  /(tabs)/import          Import tab
  /(tabs)/transcription   Transcription tab
  /(tabs)/files           Files tab
  /(tabs)/more            More tab
  /(tabs)/agent-validation  Agent validation page
  /minimal                Minimal recording test
  /trim                   Audio trimming
  /decibel                Decibel meter
  /permissions            Permission settings
  /audio-device-test      Audio device testing
  /baby-cry               Baby cry detection
  /essentia               Essentia audio analysis
  /download               Download screen
  /wasm-demo              WebAssembly demo

Environment:
  WATCHER_PORT    Metro port (default: 8110)
  CDP_TIMEOUT     Connection timeout in ms (default: 5000)
  IOS_SIMULATOR   Filter targets by iOS simulator name
  ANDROID_DEVICE  Filter targets by Android device/emulator serial`);
    process.exit(0);
  }

  const handler = COMMANDS[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    console.error(`Available: ${Object.keys(COMMANDS).join(', ')}`);
    process.exit(1);
  }

  const port = loadPort();
  const timeout = Number.parseInt(process.env.CDP_TIMEOUT || '5000', 10);

  const wsUrl = await discoverTarget(port);
  const client = await createWSClient(wsUrl, timeout);

  try {
    const result = await handler(client, args.slice(1));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    client.close();
  }
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
