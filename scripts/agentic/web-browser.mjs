#!/usr/bin/env node
/**
 * Web Browser Bridge — Playwright-based browser lifecycle manager for web
 * agentic feedback loop.
 *
 * Mirrors the command interface of cdp-bridge.mjs but uses Playwright's
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
 *   node scripts/agentic/web-browser.mjs <command> [args...]
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
 *   WATCHER_PORT    Expo web dev server port (reads from agentic.conf if unset)
 *   WEB_HEADLESS    Run browser headless (default: false)
 *   WEB_TIMEOUT     Navigation/wait timeout in ms (default: 30000)
 *   CDP_PORT        Chrome remote debugging port (default: 9222)
 *
 * Known limitation — live microphone on macOS:
 *   macOS TCC (privacy framework) attributes getUserMedia requests to the
 *   process that spawned Chrome (node), not to the Chrome bundle itself.
 *   The permission is silently denied and the audio stream produces silence.
 *   File-based audio testing works fine. For live mic validation use a
 *   regular browser session opened manually.
 */

import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve APP_ROOT from env or cwd
const APP_ROOT = process.env.APP_ROOT || process.cwd();

// Resolve playwright from APP_ROOT's node_modules (not this script's location)
const require = createRequire(path.join(APP_ROOT, 'package.json'));
const { chromium } = require('playwright');

// Read a value from agentic.conf
function readConf(key, fallback) {
    const confPath = path.join(APP_ROOT, 'scripts/agentic/agentic.conf');
    try {
        const content = fs.readFileSync(confPath, 'utf8');
        const match = content.match(new RegExp(`^${key}=(\\S+)`, 'm'));
        return match ? match[1] : fallback;
    } catch {
        return fallback;
    }
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = Number.parseInt(process.env.WATCHER_PORT || readConf('AGENTIC_PORT', '7365'), 10);
const HEADLESS = process.env.WEB_HEADLESS === 'true';
const TIMEOUT = Number.parseInt(process.env.WEB_TIMEOUT || '30000', 10);
const CDP_PORT = Number.parseInt(process.env.CDP_PORT || readConf('AGENTIC_CDP_PORT', '9222'), 10);

const AGENT_DIR = path.join(APP_ROOT, '.agent');
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
      'No running browser found. Start one with: node scripts/agentic/web-browser.mjs launch'
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
    () => globalThis.__AGENTIC__ !== undefined,
    { timeout: TIMEOUT }
  );
}

// ---------------------------------------------------------------------------
// Server mode: launch
// ---------------------------------------------------------------------------

async function cmdLaunch() {
  ensureDirs();

  if (!process.env._WEB_BROWSER_DAEMON) {
    const logFile = path.join(AGENT_DIR, 'web-browser.log');
    const logFd = fs.openSync(logFile, 'a');
    const child = spawn(process.execPath, process.argv.slice(1), {
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env: { ...process.env, _WEB_BROWSER_DAEMON: '1' },
    });
    fs.closeSync(logFd);
    child.unref();
    console.log('Browser launching in background. Logs → .agent/web-browser.log');
    process.exit(0);
  }

  const baseURL = `http://localhost:${PORT}`;

  console.log(`Launching browser (headless=${HEADLESS}, cdpPort=${CDP_PORT})...`);
  console.log(`Connecting to Expo web at ${baseURL}`);

  const launchArgs = [
    `--remote-debugging-port=${CDP_PORT}`,
    '--use-fake-ui-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
  ];
  const launchOptions = {
    headless: HEADLESS,
    args: launchArgs,
  };
  if (!HEADLESS) {
    launchOptions.channel = 'chrome';
  }
  const browser = await chromium.launch(launchOptions);

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  await context.grantPermissions(['microphone'], { origin: `http://localhost:${PORT}` });

  const page = await context.newPage();

  await page.addInitScript(() => {
    const _AC = window.AudioContext || window.webkitAudioContext;
    if (_AC) {
      window.AudioContext = class extends _AC {
        constructor(opts) {
          super(opts);
          if (this.state === 'suspended') {
            this.resume().catch(() => {});
          }
        }
      };
      if (window.webkitAudioContext) {
        window.webkitAudioContext = window.AudioContext;
      }
    }
  });

  setupConsoleCapture(page);

  // Retry page.goto — Metro may still be starting up
  const maxRetries = 10;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
      break;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.log(`Waiting for web server (attempt ${attempt}/${maxRetries})...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

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

  saveConnection(CDP_PORT);
  console.log('Browser running. Use other commands to interact, or "close" to stop.');

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
    .replaceAll(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
  const filename = `${timestamp}_${label}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);

  const { browser, page } = await connectBrowser();
  try {
    await page.screenshot({ path: filepath, fullPage: false });

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

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  console.log(`Web Browser Bridge — Playwright-based browser manager for web agentic loop

Usage:
  node scripts/agentic/web-browser.mjs <command> [args...]

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

if (command === 'launch') {
  await cmd.fn();
} else {
  const result = await cmd.fn(args.slice(1));

  if (cmd.printRaw) {
    console.log(typeof result === 'string' ? result : JSON.stringify(result));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}
