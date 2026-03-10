#!/usr/bin/env node
/**
 * start-interactive.mjs
 *
 * Tails .agent/metro.log and proxies keypresses to Metro/Expo:
 *   r  — reload JS bundle          (native: POST /reload, web: CDP Page.reload)
 *   w  — launch web browser       (Playwright CDP-enabled Chrome)
 *   d  — open dev menu            (POST /open-dev-menu)
 *   j  — open debugger            (POST /open-debugger)
 *   c  — clear screen
 *   ?  — show this help
 *   q  — quit (stop Metro and exit)
 *
 * Usage:
 *   node scripts/agentic/start-interactive.mjs [--port 7500]
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync, spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const portIdx = process.argv.indexOf('--port')
const PORT = portIdx !== -1 ? process.argv[portIdx + 1] : '7500'
const LOGFILE = path.join(ROOT, '.agent/metro.log')
const PIDFILE = path.join(ROOT, '.agent/metro.pid')

// ── helpers ──────────────────────────────────────────────────────────────────

function metroPost(endpoint) {
    try {
        execSync(`curl -sf -X POST http://localhost:${PORT}${endpoint}`, { stdio: 'pipe' })
        return true
    } catch {
        return false
    }
}

const WEB_BROWSER = path.join(ROOT, 'scripts/agentic/web-browser.mjs')
const CDP_BRIDGE = path.join(ROOT, 'scripts/agentic/cdp-bridge.mjs')

function cdpReload(device) {
    try {
        execSync(`node ${CDP_BRIDGE} --device ${device} reload`, { stdio: 'pipe' })
        return true
    } catch {
        return false
    }
}

function launchWebBrowser() {
    try { execSync(`node ${WEB_BROWSER} close`, { stdio: 'pipe' }) } catch { /* none running */ }
    const child = spawn('node', [WEB_BROWSER, 'launch'], { stdio: 'inherit', detached: false })
    child.on('error', (err) => {
        process.stdout.write(`\x1b[31m✗ Failed to launch browser: ${err.message}\x1b[0m\n`)
    })
}

function showHelp() {
    process.stdout.write([
        '',
        '\x1b[1mKeyboard shortcuts:\x1b[0m',
        '  r  Reload JS bundle',
        '  w  Open web browser',
        '  d  Open developer menu',
        '  j  Open JS debugger',
        '  c  Clear screen',
        '  ?  Show this help',
        '  q  Quit (stops Metro)',
        '',
    ].join('\n') + '\n')
}

function readPid() {
    try { return Number.parseInt(fs.readFileSync(PIDFILE, 'utf8').trim(), 10) } catch { return null }
}

// ── tail log file ─────────────────────────────────────────────────────────────

// Check if Metro was already running before this script was invoked.
// start-metro.sh truncates the log on a fresh start, so if Metro is up
// and the log has content from a previous session, skip replaying it.
const alreadyRunning = (() => {
    try { execSync(`curl -sf http://localhost:${PORT}/status`, { stdio: 'pipe' }); return true } catch { return false }
})()

// Ensure .agent dir and log file exist before watching
fs.mkdirSync(path.dirname(LOGFILE), { recursive: true })
if (!fs.existsSync(LOGFILE)) fs.writeFileSync(LOGFILE, '')

let logSize = 0
try { logSize = fs.statSync(LOGFILE).size } catch { /* first run */ }

if (alreadyRunning) {
    process.stdout.write(`\x1b[2m› Metro already running on :${PORT} — attaching\x1b[0m\n`)
} else {
    try {
        const content = fs.readFileSync(LOGFILE, 'utf8')
        const lines = content.split('\n')
        process.stdout.write(lines.slice(-40).join('\n') + '\n')
    } catch { /* log may not exist yet */ }
}

const logWatcher = fs.watch(LOGFILE, () => {
    try {
        const stat = fs.statSync(LOGFILE)
        if (stat.size <= logSize) { logSize = stat.size; return }
        const delta = stat.size - logSize
        const buf = new Uint8Array(delta)
        const fd = fs.openSync(LOGFILE, 'r')
        fs.readSync(fd, buf, 0, delta, logSize)
        fs.closeSync(fd)
        logSize = stat.size
        process.stdout.write(new TextDecoder().decode(buf))
    } catch { /* file may rotate */ }
})

// ── stdin key handling ────────────────────────────────────────────────────────

if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
}
process.stdin.resume()
process.stdin.setEncoding('utf8')

showHelp()

process.stdin.on('data', (key) => {
    if (key === '\u0003') { cleanup(); process.exit(0) }

    switch (key.toLowerCase()) {
        case 'r': {
            const nativeOk = metroPost('/reload')
            const webOk = cdpReload('web')
            if (nativeOk || webOk) {
                const targets = [nativeOk && 'native', webOk && 'web'].filter(Boolean).join(', ')
                process.stdout.write(`\x1b[32m› Reloading (${targets})...\x1b[0m\n`)
            } else {
                process.stdout.write('\x1b[31m✗ Reload failed — is Metro running?\x1b[0m\n')
            }
            break
        }
        case 'w':
            process.stdout.write('\x1b[32m› Launching web browser (CDP-enabled)...\x1b[0m\n')
            launchWebBrowser()
            break
        case 'd': {
            const ok = metroPost('/open-dev-menu')
            process.stdout.write(ok
                ? '\x1b[32m› Opening dev menu...\x1b[0m\n'
                : '\x1b[33m› dev-menu not supported via HTTP, try yarn dev-menu\x1b[0m\n')
            break
        }
        case 'j': {
            const ok = metroPost('/open-debugger')
            process.stdout.write(ok
                ? '\x1b[32m› Opening debugger...\x1b[0m\n'
                : '\x1b[33m› Debugger not supported via HTTP\x1b[0m\n')
            break
        }
        case 'c':
            process.stdout.write('\x1b[2J\x1b[H')
            break
        case '?':
        case 'h':
            showHelp()
            break
        case 'q':
            cleanup()
            process.exit(0)
            break
    }
})

// ── cleanup ───────────────────────────────────────────────────────────────────

function cleanup() {
    logWatcher.close()
    const pid = readPid()
    if (pid) {
        try {
            process.stdout.write(`\n› Stopping Metro (PID ${pid})...\n`)
            process.kill(pid, 'SIGTERM')
            fs.unlinkSync(PIDFILE)
        } catch { /* already gone */ }
    }
    if (process.stdin.isTTY) process.stdin.setRawMode(false)
    process.stdin.pause()
}

process.on('SIGINT', () => { cleanup(); process.exit(0) })
process.on('SIGTERM', () => { cleanup(); process.exit(0) })

process.stdout.write(`\x1b[2m› Tailing ${LOGFILE} — press ? for help\x1b[0m\n`)
