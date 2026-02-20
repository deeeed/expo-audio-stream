#!/usr/bin/env node
/**
 * Web Browser Bridge — Playwright-based browser lifecycle manager for web
 * agentic feedback loop.
 *
 * Mirrors the command interface of cdp-bridge.js but uses Playwright's
 * page.evaluate() to call globalThis.__AGENTIC__ methods.
 *
 * Two modes:
 *   Server mode (launch): Start Chromium with --remote-debugging-port,
 *     navigate to app, capture console logs, write connection info to
 *     .agent/web-browser.json, keep running.
 *   Command mode (all others): Connect to running browser via
 *     connectOverCDP, execute command, print JSON result, exit.
 *
 * Usage:
 *   node scripts/agentic/web-browser.js <command> [args...]
 *
 * Commands:
 *   launch                    Start browser, navigate to app, begin log capture
 *   navigate <path>           Navigate to a route (Expo Router path)
 *   get-route                 Get current route path
 *   get-state                 Get audio recorder state
 *   eval <expression>         Evaluate arbitrary JS in app context
 *   can-go-back               Check if navigation can go back
 *   go-back                   Navigate back
 *   screenshot [label]        Take a screenshot
 *   logs                      Print captured console logs
 *   close                     Close browser, cleanup
 *
 * Environment:
 *   WATCHER_PORT    Expo web dev server port (default: 7365)
 *   WEB_HEADLESS    Run browser headless (default: false)
 *   WEB_TIMEOUT     Navigation/wait timeout in ms (default: 30000)
 *   CDP_PORT        Chrome remote debugging port (default: 9222)
 */

'use strict';

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.WATCHER_PORT || '7365', 10);
const HEADLESS = process.env.WEB_HEADLESS === 'true';
const TIMEOUT = parseInt(process.env.WEB_TIMEOUT || '30000', 10);
const CDP_PORT = parseInt(process.env.CDP_PORT || '9222', 10);

const PLAYGROUND_ROOT = path.resolve(__dirname, '../..');
const AGENT_DIR = path.join(PLAYGROUND_ROOT, '.agent');
const CONNECTION_FILE = path.join(AGENT_DIR, 'web-browser.json');
const CONSOLE_LOG_FILE = path.join(AGENT_DIR, 'web-console.log');
const SCREENSHOT_DIR = path.join(AGENT_DIR, 'screenshots');

function ensureDirs() {
  fs.mkdirSync(AGENT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Connection persistence
// ---------------------------------------------------------------------------

function saveConnection(cdpPort) {
  ensureDirs();
  fs.writeFileSync(
    CONNECTION_FILE,
    JSON.stringify({ cdpPort, appPort: PORT, pid: process.pid }, null, 2)
  );
}

function loadConnection() {
  if (!fs.existsSync(CONNECTION_FILE)) {
    throw new Error(
      'No running browser found. Start one with: node scripts/agentic/web-browser.js launch'
    );
  }
  return JSON.parse(fs.readFileSync(CONNECTION_FILE, 'utf8'));
}

function clearConnection() {
  if (fs.existsSync(CONNECTION_FILE)) {
    fs.unlinkSync(CONNECTION_FILE);
  }
}

// ---------------------------------------------------------------------------
// Console log capture
// ---------------------------------------------------------------------------

function setupConsoleCapture(page) {
  ensureDirs();
  fs.writeFileSync(CONSOLE_LOG_FILE, '');

  page.on('console', (msg) => {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${msg.type()}] ${msg.text()}\n`;
    fs.appendFileSync(CONSOLE_LOG_FILE, line);
  });

  page.on('pageerror', (err) => {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [ERROR] ${err.message}\n`;
    fs.appendFileSync(CONSOLE_LOG_FILE, line);
  });
}

// ---------------------------------------------------------------------------
// Wait for __AGENTIC__ bridge
// ---------------------------------------------------------------------------

async function waitForBridge(page) {
  await page.waitForFunction(
    () => typeof globalThis.__AGENTIC__ !== 'undefined',
    { timeout: TIMEOUT }
  );
}

// ---------------------------------------------------------------------------
// Server mode: launch
// ---------------------------------------------------------------------------

async function cmdLaunch() {
  ensureDirs();

  const baseURL = `http://localhost:${PORT}`;

  console.log(`Launching browser (headless=${HEADLESS}, cdpPort=${CDP_PORT})...`);
  console.log(`Connecting to Expo web at ${baseURL}`);

  // Launch with remote debugging port so command mode can reconnect via CDP.
  // Use system Chrome ('channel: chrome') for non-headless mode since
  // Playwright's bundled Chromium crashes on macOS with
  // --remote-debugging-port in non-headless mode.
  const launchOptions = {
    headless: HEADLESS,
    args: [`--remote-debugging-port=${CDP_PORT}`],
  };
  if (!HEADLESS) {
    launchOptions.channel = 'chrome';
  }
  const browser = await chromium.launch(launchOptions);

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    permissions: ['microphone'],
  });
  const page = await context.newPage();

  setupConsoleCapture(page);

  // Navigate to the app
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

  // Wait for the agentic bridge to be installed
  console.log('Waiting for __AGENTIC__ bridge...');
  try {
    await waitForBridge(page);
  } catch {
    console.error(
      'ERROR: __AGENTIC__ bridge not found. Is the app running in __DEV__ mode?'
    );
    await browser.close();
    process.exit(1);
  }

  const platform = await page.evaluate(() => globalThis.__AGENTIC__?.platform);
  console.log(`Bridge connected (platform=${platform})`);

  // Save connection info
  saveConnection(CDP_PORT);
  console.log(`Connection saved to ${CONNECTION_FILE}`);
  console.log(`Console logs → ${CONSOLE_LOG_FILE}`);
  console.log('Browser running. Use other commands to interact, or "close" to stop.');

  // Keep process alive — the browser + console capture runs in this process
  await new Promise((resolve) => {
    const shutdown = async () => {
      console.log('\nShutting down browser...');
      clearConnection();
      await browser.close();
      resolve();
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
}

// ---------------------------------------------------------------------------
// Command mode: connect to existing browser via CDP
// ---------------------------------------------------------------------------

async function connectBrowser() {
  const { cdpPort } = loadConnection();
  const browser = await chromium.connectOverCDP(`http://localhost:${cdpPort}`);
  const contexts = browser.contexts();
  if (contexts.length === 0) {
    throw new Error('No browser contexts found. Browser may have been closed.');
  }
  const pages = contexts[0].pages();
  if (pages.length === 0) {
    throw new Error('No pages found. Browser may have been closed.');
  }
  return { browser, page: pages[0] };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdNavigate(args) {
  const routePath = args[0];
  if (!routePath) {
    throw new Error('Usage: navigate <path>  (e.g. /(tabs)/record, /minimal)');
  }

  const { browser, page } = await connectBrowser();
  try {
    const previousRoute = await page.evaluate(
      () => globalThis.__AGENTIC__?.getRoute()
    );

    await page.evaluate(
      (p) => globalThis.__AGENTIC__?.navigate(p),
      routePath
    );

    // Small delay for navigation to settle
    await page.waitForTimeout(500);

    const currentRoute = await page.evaluate(
      () => globalThis.__AGENTIC__?.getRoute()
    );

    return {
      navigated: routePath,
      previousRoute,
      currentRoute,
      platform: 'web',
    };
  } finally {
    await browser.close();
  }
}

async function cmdGetRoute() {
  const { browser, page } = await connectBrowser();
  try {
    return await page.evaluate(() => globalThis.__AGENTIC__?.getRoute());
  } finally {
    await browser.close();
  }
}

async function cmdGetState() {
  const { browser, page } = await connectBrowser();
  try {
    return await page.evaluate(() => globalThis.__AGENTIC__?.getState());
  } finally {
    await browser.close();
  }
}

async function cmdEval(args) {
  const expression = args.join(' ');
  if (!expression) {
    throw new Error('Usage: eval <expression>');
  }

  const { browser, page } = await connectBrowser();
  try {
    return await page.evaluate((expr) => {
      // eslint-disable-next-line no-eval
      return eval(expr);
    }, expression);
  } finally {
    await browser.close();
  }
}

async function cmdCanGoBack() {
  const { browser, page } = await connectBrowser();
  try {
    return await page.evaluate(() => globalThis.__AGENTIC__?.canGoBack());
  } finally {
    await browser.close();
  }
}

async function cmdGoBack() {
  const { browser, page } = await connectBrowser();
  try {
    await page.evaluate(() => globalThis.__AGENTIC__?.goBack());
    await page.waitForTimeout(300);
    const route = await page.evaluate(() => globalThis.__AGENTIC__?.getRoute());
    return { currentRoute: route };
  } finally {
    await browser.close();
  }
}

async function cmdScreenshot(args) {
  const label = args[0] || 'screenshot';
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
  const filename = `${timestamp}_${label}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);

  const { browser, page } = await connectBrowser();
  try {
    await page.screenshot({ path: filepath, fullPage: false });

    // Cleanup old screenshots (keep last 20)
    const files = fs
      .readdirSync(SCREENSHOT_DIR)
      .filter((f) => f.endsWith('.png'))
      .sort()
      .reverse();
    for (const f of files.slice(20)) {
      fs.unlinkSync(path.join(SCREENSHOT_DIR, f));
    }

    return filepath;
  } finally {
    await browser.close();
  }
}

async function cmdLogs() {
  if (!fs.existsSync(CONSOLE_LOG_FILE)) {
    return '(no console logs captured yet)';
  }
  return fs.readFileSync(CONSOLE_LOG_FILE, 'utf8');
}

async function cmdClose() {
  const conn = loadConnection();
  // Kill the launch process which owns the browser
  if (conn.pid) {
    try {
      process.kill(conn.pid, 'SIGTERM');
    } catch {
      // Process may already be dead
    }
  }
  clearConnection();
  return { closed: true };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const COMMANDS = {
  launch: { fn: cmdLaunch, printRaw: false },
  navigate: { fn: cmdNavigate, printRaw: false },
  'get-route': { fn: cmdGetRoute, printRaw: false },
  'get-state': { fn: cmdGetState, printRaw: false },
  eval: { fn: cmdEval, printRaw: false },
  'can-go-back': { fn: cmdCanGoBack, printRaw: false },
  'go-back': { fn: cmdGoBack, printRaw: false },
  screenshot: { fn: cmdScreenshot, printRaw: true },
  logs: { fn: cmdLogs, printRaw: true },
  close: { fn: cmdClose, printRaw: false },
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`Web Browser Bridge — Playwright-based browser manager for web agentic loop

Usage:
  node scripts/agentic/web-browser.js <command> [args...]

Commands:
  launch                    Start browser, navigate to app, begin log capture
  navigate <path>           Navigate to a route (Expo Router path)
  get-route                 Get current route path
  get-state                 Get audio recorder state
  eval <expression>         Evaluate arbitrary JS in app context
  can-go-back               Check if navigation can go back
  go-back                   Navigate back
  screenshot [label]        Take a screenshot
  logs                      Print captured console logs
  close                     Close browser, cleanup

Environment:
  WATCHER_PORT    Expo web dev server port (default: ${PORT})
  WEB_HEADLESS    Run browser headless (default: false, set to "true" for CI)
  WEB_TIMEOUT     Navigation/wait timeout in ms (default: 30000)
  CDP_PORT        Chrome remote debugging port (default: 9222)`);
    process.exit(0);
  }

  const cmd = COMMANDS[command];
  if (!cmd) {
    console.error(`Unknown command: ${command}`);
    console.error(`Available: ${Object.keys(COMMANDS).join(', ')}`);
    process.exit(1);
  }

  // launch is special — it doesn't return a result to print
  if (command === 'launch') {
    await cmd.fn();
    return;
  }

  const result = await cmd.fn(args.slice(1));

  if (cmd.printRaw) {
    console.log(typeof result === 'string' ? result : JSON.stringify(result));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
