import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { withProjectRecipeHost } from '@farmslot/recipe-cli/harness';
import { withRecipeExecutionSignal } from '@farmslot/recipe-runner/adapters/core';
import { createProvider } from './provider.mjs';
import { createBridge } from './adapters.mjs';
import { repoRoot, createAudiolabManifest } from './host.mjs';
import { stopMetro } from '../lib/metro-process.mjs';

function context(app = 'playground', platform = 'web') {
  return { project: { checkoutRoot: repoRoot, app: `apps/${app}` },
    target: { value: path.join(repoRoot, 'apps', app) }, adapter: { value: platform },
    options: { watcherPort: '19746', cdpPort: '19767', ...(platform === 'ios' ? { device: 'assigned-simulator' } : {}) } };
}

test('provider factories are read-only and preserve app-scoped handler declarations', async () => {
  const keys = ['METRO_PORT', 'WATCHER_PORT', 'CDP_PORT', 'PLATFORM', 'AUDIOLAB_APP'];
  const before = keys.map(key => process.env[key]);
  for (const app of ['playground', 'sherpa-voice']) {
    const provider = createProvider(context(app));
    assert.equal(provider.engine, undefined);
    assert.equal(provider.runtime.sdkVersion, 1);
    assert.equal(provider.runtime.id, 'web');
    const handlers = await provider.runtime.actions.adapters();
    assert.deepEqual(handlers.map(h => h.action), ['audiolab.query', 'audiolab.choose', 'audiolab.logs', 'audiolab.native_preview']);
    const allowed = createAudiolabManifest(app).actions['audiolab.query'].schema.properties.ref.enum;
    assert.equal(provider.runtime.actions.inputFindings('read', { action: 'audiolab.query', ref: allowed[0] }).length, 0);
    assert.equal(provider.runtime.actions.inputFindings('read', { action: 'audiolab.query', ref: 'foreign-app-query' })[0].severity, 'error');
  }
  assert.ok(keys.every((key, i) => process.env[key] === before[i]), 'Factory changed runtime settings.');
});

test('provider rejects unsupported or ambiguous app/device targeting before execution', () => {
  assert.throws(() => createProvider(context('minimal')), /Unknown app/);
  assert.throws(() => createProvider(context('playground', 'mobile')), /Select web, ios or android/);
  const missing = context('playground', 'ios');delete missing.options.device;
  const env = process.env.IOS_SIMULATOR;const phone = process.env.IOS_DEVICE_UDID;
  delete process.env.IOS_SIMULATOR;delete process.env.IOS_DEVICE_UDID;
  try { assert.throws(() => createProvider(missing), /assigned iOS device/); }
  finally { if (env !== undefined) process.env.IOS_SIMULATOR = env;if (phone !== undefined) process.env.IOS_DEVICE_UDID = phone; }
  const wrong = context();wrong.target.value = repoRoot;
  assert.throws(() => createProvider(wrong), /selected app checkout/);
});

test('the declared factory resolves through the public shared host and default engine', async () => {
  await withProjectRecipeHost({ tokens: ['--project', 'audiolab-farm', '--target', repoRoot, '--app', 'apps/playground', '--adapter', 'web', '--watcher-port', '19746', '--cdp-port', '19767'],
    projectsDir: path.join(repoRoot, 'farmslot/projects'), command: 'run', options: { plan: true, watcherPort: '19746', cdpPort: '19767' } }, async host => {
    assert.equal(host.context.project.provider.module, path.join(repoRoot, 'scripts/agentic/recipe/provider.mjs'));
    assert.equal(host.provider.engine, undefined);
    const selected = await host.engine.resolveActionManifest('web');
    const runner = await host.engine.createRunner('web', selected.manifest, { source: { kind: 'operator', trust: 'trusted', name: 'audiolab-test' } });
    const plan = await runner.preflight({ projectRoot: host.context.target.value, artifactsDir: path.join(repoRoot, '.agent/provider-test'),
      recipePath: path.join(repoRoot, 'scripts/agentic/recipe/recipes/playground/smoke.navigation.recipe.json'), adapter: 'web', librarySources: host.librarySources });
    assert.ok(plan.nodes.some(n => n.action === 'assert_output'));
    assert.ok(plan.nodes.some(n => n.id === 'assert-restored' || n.nodeId === 'assert-restored'));
    const [command] = host.provider.runtime.actions.wrap([{ action: 'command', execute: (_node, ctx) => ({ output: { root: ctx.projectRoot, file: ctx.resolveProjectPath('scripts/agentic/recipe/queries.json') } }) }]);
    const output = command.execute({}, { projectRoot: host.context.target.value, resolveProjectPath: relative => path.join(host.context.target.value, relative) }).output;
    assert.equal(output.root, repoRoot);
    assert.equal(output.file, path.join(repoRoot, 'scripts/agentic/recipe/queries.json'));
  });
});

test('bridge cancellation stops the owned child instead of leaving a stalled action', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'audiolab-provider-cancel-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'scripts/agentic'), { recursive: true });
  const marker = path.join(root, 'pid');
  await fs.writeFile(path.join(root, 'scripts/agentic/cdp-bridge.mjs'), `import fs from 'node:fs';fs.writeFileSync(${JSON.stringify(marker)},String(process.pid));setInterval(()=>{},100);`);
  const controller = new AbortController();
  const run = withRecipeExecutionSignal(controller.signal, () => createBridge({ appRoot: root, device: 'web', platform: 'web' })(['get-route'], 2000));
  const rejection = assert.rejects(run, /abort|cancel/i);
  t.after(() => controller.abort());
  const deadline = Date.now() + 2000;
  while (!(await fs.stat(marker).catch(() => false))) {
    assert.ok(Date.now() < deadline);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  const pid = Number(await fs.readFile(marker, 'utf8'));
  controller.abort();await rejection;
  assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
});

test('Metro stop refuses a foreign listener and stale PID but stops the owned server', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'audiolab-provider-metro-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const owner = path.join(root, 'owner');const foreign = path.join(root, 'foreign');
  for (const dir of [owner, foreign]) await fs.mkdir(path.join(dir, '.agent'), { recursive: true });
  const script = path.join(root, 'metro-fixture.mjs');
  await fs.writeFile(script, `import net from 'node:net';const s=net.createServer();s.listen(0,'127.0.0.1',()=>console.log(s.address().port));`);
  const child = spawn(process.execPath, [script], { cwd: foreign, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) { child.kill();await once(child, 'exit'); } });
  const port = Number((await once(child.stdout, 'data'))[0].toString().trim());
  await fs.writeFile(path.join(owner, '.agent/metro.pid'), String(child.pid));
  assert.throws(() => stopMetro(owner, port), /another checkout/);
  assert.doesNotThrow(() => process.kill(child.pid, 0));
  const exit = once(child, 'exit');
  assert.equal(stopMetro(foreign, port).signalled, 1);
  await exit;
});
