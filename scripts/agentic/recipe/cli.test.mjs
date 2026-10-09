import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './host.mjs';

const execute = promisify(execFile);
const cli = fileURLToPath(new URL('./run.mjs', import.meta.url));

test('public manifest command returns the gateway action contract', async () => {
  const { stdout } = await execute(process.execPath, [cli, 'manifest']);
  const manifest = JSON.parse(stdout);
  assert.equal(manifest.$schema, 'https://farmslot.io/schemas/action-manifest-v1.schema.json');
  assert.ok(manifest.actions['app.hud']);
  assert.ok(manifest.actions['audiolab.native_preview']);
});

test('relative Sherpa recipe paths resolve and select the right app', async () => {
  const { stdout } = await execute(process.execPath, [cli, 'validate', 'scripts/agentic/recipe/recipes/sherpa/asr-ui-validate-qwen3.recipe.json', '--platform', 'ios'], { cwd: repoRoot });
  assert.equal(JSON.parse(stdout).status, 'pass');
  assert.equal(JSON.parse(stdout).app, 'sherpa-voice');
});

test('gateway-quoted recipe and artifact paths reach the hook unchanged', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'audiolab-hook-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const runnerDir = path.join(root, 'scripts/agentic/recipe');
  await fs.mkdir(runnerDir, { recursive: true });
  await fs.writeFile(path.join(runnerDir, 'run.mjs'), 'console.log(JSON.stringify(process.argv.slice(2)))');
  const recipe = path.join(root, 'input recipe.json');
  const artifacts = path.join(root, 'proof artifacts');
  const project = JSON.parse(await fs.readFile(path.join(repoRoot, 'farmslot/projects/audiolab-farm/project.json'), 'utf8'));
  const variables = { farmslot_dir: path.join(repoRoot, 'farmslot'), repo: root, metro_port: '7466', cdp_port: '7676', platform: 'web', simulator: '', adb_serial: '', recipe_path: `'${recipe}'`, artifacts_dir: `'${artifacts}'` };
  const command = project.hooks.recipe_run.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key]);
  const { stdout } = await execute('bash', ['-c', command], { env: { ...process.env, AUDIOLAB_NPM_TOKEN: 'fixture', EAS_PROJECT_ID: 'fixture', APPLE_TEAM_ID: 'fixture' } });
  const args = JSON.parse(stdout);
  assert.equal(args[1], recipe);
  assert.equal(args[args.indexOf('--artifacts-dir') + 1], artifacts);
  assert.equal(args[args.indexOf('--platform') + 1], 'web');
});

test('web preflight launches Metro and a headless browser', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'audiolab-web-hook-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const scripts = path.join(root, 'apps/playground/scripts/agentic');
  await fs.mkdir(scripts, { recursive: true });
  await fs.writeFile(path.join(scripts, 'start-metro.sh'), 'echo metro-started\n');
  await fs.writeFile(path.join(scripts, 'preflight.sh'), 'echo native-called\n');
  await fs.writeFile(path.join(scripts, 'web-browser.mjs'), 'console.log(JSON.stringify({ stage: "browser", headless: process.env.WEB_HEADLESS, channel: process.env.WEB_BROWSER_CHANNEL, port: process.env.METRO_PORT }))');
  const configDir = path.join(root, 'scripts/agentic/lib');
  await fs.mkdir(configDir, { recursive: true });
  await fs.copyFile(path.join(repoRoot, 'scripts/agentic/lib/runtime-config.cjs'), path.join(configDir, 'runtime-config.cjs'));
  const { stdout } = await execute('bash', [path.join(repoRoot, 'farmslot/projects/audiolab-farm/scripts/runtime.sh'), 'launch', root, '7466', '7676', 'web'], { env: { ...process.env, AUDIOLAB_NPM_TOKEN: 'fixture', EAS_PROJECT_ID: 'fixture', APPLE_TEAM_ID: 'fixture' } });
  assert.equal(stdout.split('\n')[0], 'metro-started');
  assert.deepEqual(JSON.parse(stdout.split('\n')[1]), { stage: 'browser', headless: 'true', channel: 'chrome', port: '7466' });
  assert.ok(!stdout.includes('native-called'));
});

test('file recipes cannot read outside the selected project root', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'audiolab-outside-recipe-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, 'outside.recipe.json');
  await fs.writeFile(file, JSON.stringify({ $schema: 'https://farmslot.io/schemas/recipe-v1.schema.json', workflow: { entry: 'done', nodes: { done: { action: 'end', status: 'pass' } } } }));
  await assert.rejects(execute(process.execPath, [cli, 'validate', file], { cwd: repoRoot }), /outside|escape|within|relative/i);
});

test('file recipes resolve through a symlinked repo path', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'audiolab-symlink-recipe-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const alias = path.join(root, 'repo');
  await fs.symlink(repoRoot, alias, 'dir');
  const file = path.join(alias, 'scripts/agentic/recipe/recipes/playground/smoke.navigation.recipe.json');
  const { stdout } = await execute(process.execPath, [cli, 'validate', file], { cwd: repoRoot });
  assert.equal(JSON.parse(stdout).status, 'pass');
});
