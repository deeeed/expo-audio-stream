#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.resolve(__dirname, '../..');
process.chdir(process.env.APP_ROOT);
await import('../../../../scripts/agentic/cdp-bridge.mjs');
