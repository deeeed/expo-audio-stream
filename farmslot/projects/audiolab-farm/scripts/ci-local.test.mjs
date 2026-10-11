import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'audiolab-ci-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = path.join(root, 'repo');
  const bin = path.join(root, 'bin');
  mkdirSync(bin);
  for (const name of ['audio-studio', 'moonshine.rn', 'sherpa-onnx.rn']) {
    const directory = path.join(repo, 'packages', name);
    mkdirSync(path.join(directory, 'src'), { recursive: true });
    writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name: `@siteed/${name}`, scripts: { typecheck: 'tsc --noEmit', lint: 'eslint src', test: 'jest' } }));
    writeFileSync(path.join(directory, 'src/index.ts'), 'export const value = 1;\n');
  }
  const recipes = path.join(repo, 'scripts/agentic/recipe');
  mkdirSync(recipes, { recursive: true });
  writeFileSync(path.join(recipes, 'validate-all.mjs'), 'console.log("recipe protocol checked");\n');
  writeFileSync(path.join(recipes, 'adapters.mjs'), 'export const value = 1;\n');
  writeFileSync(path.join(recipes, 'adapters.test.mjs'), 'import assert from "node:assert/strict"; import { value } from "./adapters.mjs"; assert.equal(value,1);\n');
  const log = path.join(root, 'calls.jsonl');
  writeFileSync(path.join(bin, 'yarn'), `#!/usr/bin/env node
import fs from 'node:fs';
const args=process.argv.slice(2);
fs.appendFileSync(process.env.AUDIO_CI_TEST_LOG,JSON.stringify(args)+'\\n');
process.exit(args.includes('test')&&process.env.AUDIO_CI_TEST_UNIT_FAIL?7:0);
`, { mode: 0o755 });
  const git = (args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
  git(['init', '-q', '-b', 'main']);
  git(['add', '.']);
  git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--no-gpg-sign', '-qm', 'Initial']);
  git(['update-ref', 'refs/remotes/origin/main', 'HEAD']);
  const run = (extra = {}) => {
    const env = { ...process.env, PATH: bin + path.delimiter + process.env.PATH, AUDIO_CI_TEST_LOG: log, ...extra };
    // This fixture launches the standalone worker command, outside node:test.
    delete env.NODE_TEST_CONTEXT;
    return spawnSync(process.execPath, [path.join(scriptDir, 'ci-local.mjs')], { cwd: repo, env, encoding: 'utf8' });
  };
  const calls = () => readFileSync(log, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  return { repo, run, calls };
}

test('a library source change runs its CI types, changed-file lint and related tests only', (t) => {
  const { repo, run, calls } = fixture(t);
  const file = 'packages/sherpa-onnx.rn/src/space name.ts';
  writeFileSync(path.join(repo, file), 'export {};\n');
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const commands = calls();
  assert.equal(commands.length, 3);
  assert.deepEqual(commands[0], ['workspace', '@siteed/sherpa-onnx.rn', 'typecheck', '--incremental', 'false']);
  assert.ok(commands[1].includes('src/space name.ts'));
  assert.ok(commands[2].includes('--findRelatedTests'));
  assert.ok(commands[2].includes(path.join(realpathSync(repo), file)));
  assert.ok(commands.every((args) => !args.includes('@siteed/moonshine.rn')));
});

test('a related-unit failure refuses the parity check with its exit code', (t) => {
  const { repo, run } = fixture(t);
  writeFileSync(path.join(repo, 'packages/moonshine.rn/src/index.ts'), 'export const value = 2;\n');
  assert.equal(run({ AUDIO_CI_TEST_UNIT_FAIL: '1' }).status, 7);
});

test('recipe implementation changes execute unchanged adapter tests', (t) => {
  const { repo, run } = fixture(t);
  writeFileSync(path.join(repo, 'scripts/agentic/recipe/adapters.mjs'), 'export const value = 2;\n');
  const result = run();
  assert.notEqual(result.status, 0, result.stdout + '\n' + result.stderr);
  assert.match(result.stderr, /Recipe adapter tests failed/);
});

test('each PR-producing catalog entry uses the shared step and the portable prepared command', () => {
  const project = path.dirname(scriptDir);
  const config = JSON.parse(readFileSync(path.join(project, 'project.json'), 'utf8'));
  assert.equal(config.ci.local_check, 'bash apps/playground/.agent/ci-parity');
  for (const flow of ['dev', 'fix-bug', 'pr-complete', 'update-branch']) {
    const text = readFileSync(path.join(project, 'checklists', flow, 'default.md'), 'utf8');
    assert.equal((text.match(/\{\{CI_PARITY_STEP\}\}/g) || []).length, 1, flow);
  }
});
