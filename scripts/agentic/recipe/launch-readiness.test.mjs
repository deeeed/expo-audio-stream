import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { selectIOSDevice, physicalIOSDeviceForTarget } from '../lib/ios-devices.mjs';

const execute = promisify(execFile);
const helper = fileURLToPath(new URL('../lib/wait-ready.py', import.meta.url));

test('readiness retries a transient failure and records actual readiness', async () => {
  const code = 'import time,sys;sys.exit(0 if time.monotonic() >= float(sys.argv[1]) else 1)';
  const { stdout: readyAt } = await execute('python3', ['-c', 'import time;print(time.monotonic()+0.2)']);
  const { stdout } = await execute('python3', [helper, 'poll', '2', 'bridge', 'python3', '-c', code, readyAt.trim()]);
  assert.match(stdout, /PASS bridge ready after/);
});

test('missing debug target fails instead of reporting launch success', async () => {
  await assert.rejects(execute('python3', [helper, 'poll', '0.15', 'bridge', 'python3', '-c', 'import sys;sys.exit(1)']), error => {
    assert.match(error.stderr, /FAIL bridge did not become ready/);
    return true;
  });
});

test('a stuck launch command is bounded and its process is stopped', async () => {
  await assert.rejects(execute('python3', [helper, 'run', '0.15', 'build', 'python3', '-c',
    'import os,signal;print(os.getpid(),flush=True);signal.pause()']), error => {
    const pid = Number(error.stdout.split('\n').find(line => /^\d+$/.test(line)));
    assert.ok(pid > 0);
    assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
    assert.match(error.stderr, /FAIL build did not become ready/);
    return true;
  });
});

test('default native selections reach the readiness resolver', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'audiolab-launch-default-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(path.join(directory, 'adb'), '#!/bin/sh\nprintf "Pixel_6\\n"\n', { mode: 0o755 });
  const preflight = await fs.readFile(new URL('../preflight.sh', import.meta.url), 'utf8');
  const readiness = preflight.slice(preflight.indexOf('# A successful process launch'));
  const repo = path.resolve(import.meta.dirname, '../../..');
  const stub = 'info() { :; }; launch_stage() { shift 3; node() { printf "%s\\n" "$*"; }; "$@"; };';
  for (const [platform, expected] of [['ios', 'configured-sim'], ['android', 'Pixel_6']]) {
    const env = { ...process.env, PATH: `${directory}:${process.env.PATH}`, PLATFORM: platform,
      MONOREPO_ROOT: repo, APP_ROOT: path.join(repo, 'apps/playground'), PORT: '7466',
      SIM: 'configured-sim', SERIAL: 'assigned-serial' };
    delete env.IOS_SIMULATOR;
    delete env.ADB_SERIAL;
    delete env.IOS_DEVICE_UDID;
    const { stdout } = await execute('bash', ['-c', `${stub}\n${readiness}`], { env });
    assert.match(stdout, new RegExp(`--device ${expected} get-route`));
  }
});

test('physical screenshot selection refuses a different phone from the runtime', () => {
  const devices = [{ name: 'Connected iPhone', udid: 'assigned', identifier: 'core-device' },
    { name: 'Other iPhone', udid: 'other', identifier: 'other-core' }];
  assert.equal(selectIOSDevice({ udid: 'assigned', name: 'Connected iPhone' }, devices).udid, 'assigned');
  assert.throws(() => selectIOSDevice({ udid: 'assigned', name: 'Other iPhone' }, devices));
  const sameName = devices.map(device => ({ ...device, name: 'iPhone' }));
  assert.equal(physicalIOSDeviceForTarget({ deviceName: 'iPhone' }, sameName), undefined);
  assert.equal(physicalIOSDeviceForTarget({ deviceName: 'iPhone', reactNative: { logicalDeviceId: 'assigned' } }, sameName).udid, 'assigned');
});

test('timeout stops a descendant that outlives its command leader', async t => {
  let descendant;
  t.after(() => {
    if (!descendant) return;
    try { process.kill(descendant, 'SIGKILL'); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
  });
  const child = 'import signal;signal.signal(signal.SIGTERM,signal.SIG_IGN);print("ready",flush=True);signal.pause()';
  const parent = `import signal,subprocess,sys;p=subprocess.Popen([sys.executable,"-c",${JSON.stringify(child)}],stdout=subprocess.PIPE);p.stdout.readline();print(p.pid,flush=True);signal.pause()`;
  const error = await execute('python3', [helper, 'run', '0.3', 'build', 'python3', '-c', parent])
    .then(() => null, error => error);
  assert.ok(error);
  descendant = Number(error.stdout.split('\n').find(line => /^\d+$/.test(line)));
  assert.ok(descendant > 0);
  assert.match(error.stderr, /FAIL build did not become ready/);
  const { stdout } = await execute('/bin/ps', ['-p', String(descendant), '-o', 'state=']).catch(error => error);
  assert.ok(!stdout.trim() || stdout.trim().startsWith('Z'), 'descendant must have stopped');
});
