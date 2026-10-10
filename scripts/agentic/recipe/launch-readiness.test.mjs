import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

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
