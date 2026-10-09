#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { Command } from 'commander';
import { readRecipeCliJsonFileWithinRoot } from '@farmslot/recipe-runner/cli/support';
import { buildDiscoveryIndex, findRecipe, registerDiscoveryCommands } from '@farmslot/recipe-cli';
import { manifest, actionNames, library, repoRoot, createAudiolabHost, recipeApp, appDomain, appRootFor, resolveDevice, matrixDevices, selectMatrixDevice, captureFailureDiagnostics } from './host.mjs';

const args = process.argv.slice(2);

async function discovery(argv) {
  const program = new Command().name('audiolab-recipe');
  registerDiscoveryCommands(program, { commandName: 'audiolab-recipe', handlers: actionNames });
  await program.parseAsync([...argv, '--library', library], { from: 'user' });
}

if (['list', 'actions', 'describe', 'explain', 'search', 'template', 'completions'].includes(args[0])) {
  await discovery(args);
} else if (args[0] === 'manifest') {
  console.log(JSON.stringify(manifest, null, 2));
} else if (args[0] === 'run' && args.includes('--list')) {
  await discovery(['list', ...args.slice(1).filter(arg => arg !== '--list')]);
} else {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    app: { type: 'string' },
    platform: { type: 'string', default: process.env.PLATFORM ?? 'web' },
    device: { type: 'string' }, 'project-root': { type: 'string' }, 'artifacts-dir': { type: 'string' },
    param: { type: 'string', multiple: true }, matrix: { type: 'string' }, step: { type: 'string' },
    'dry-run': { type: 'boolean' }, 'no-hud': { type: 'boolean' }, 'update-baselines': { type: 'boolean' }, json: { type: 'boolean' },
    describe: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
  } });
  const [command = 'help', recipeName] = positionals;
  if (command === 'help' || values.help) {
    console.log('Usage: node scripts/agentic/recipe/run.mjs <list|actions|describe|explain|run|validate|doctor|device> [recipe] [--app playground|sherpa-voice] [--platform web|ios|android] [--device name] [--param key=value] [--artifacts-dir path] [--dry-run] [--matrix web,ios,android]');
  } else if (values.describe) {
    await discovery(['describe', recipeName, '--platform', values.platform, ...(values.json ? ['--json'] : [])]);
  } else {
    if (command === 'run' && !values.matrix && !values['dry-run'] && values.device && !values.device.toLowerCase().includes('web') && !process.env.PLATFORM && !args.some(arg => arg === '--platform' || arg.startsWith('--platform='))) throw new Error('Native proof requires --platform ios or android.');
    const projectRoot = path.resolve(values['project-root'] ?? repoRoot);
    const documentPath = path.resolve(recipeName ?? '');
    const isFile = Boolean(recipeName && await fs.stat(documentPath).then(info => info.isFile(), () => false));
    const canonicalRoot = isFile ? await fs.realpath(projectRoot) : projectRoot;
    const canonicalDocument = isFile ? await fs.realpath(documentPath) : documentPath;
    const recipeDocument = isFile ? await readRecipeCliJsonFileWithinRoot(canonicalRoot, path.relative(canonicalRoot, canonicalDocument)) : undefined;
    const documentDomain = Object.values(recipeDocument?.workflow?.nodes ?? {}).map(node => recipeApp(node.ref)).find(Boolean);
    const app = values.app ?? recipeApp(recipeName) ?? documentDomain ?? process.env.AUDIOLAB_APP ?? (path.basename(process.cwd()) === 'sherpa-voice' ? 'sherpa-voice' : 'playground');
    const appRoot = appRootFor(projectRoot, app);
    const domain = appDomain(app);
    const params = Object.fromEntries((values.param ?? []).map(arg => {
      const split = arg.indexOf('=');
      if (split < 1) throw new Error('Parameters require key=value.');
      const raw = arg.slice(split + 1);
      let value;
      try { value = JSON.parse(raw); } catch { value = raw; }
      return [arg.slice(0, split), value];
    }));
    const platforms = (values.matrix ?? values.platform).split(',').map(value => value.trim());
    for (const platform of platforms) {
      if (!['web', 'ios', 'android'].includes(platform)) throw new Error(`Unknown platform: ${platform}`);
    }
    const devices = values.matrix && command === 'run' && !values['dry-run'] ? await matrixDevices(appRoot) : [];
    const matrixTargets = values.matrix && !values['dry-run'] ? new Map(platforms.map(platform => [platform, selectMatrixDevice(platform, devices, values.device)])) : null;
    const missing = matrixTargets ? [...matrixTargets].filter(([, target]) => !target).map(([platform]) => platform) : [];
    if (missing.length) throw new Error(`Matrix run missing device(s) for: ${missing.join(', ')}`);
    const artifactRoot = path.resolve(values['artifacts-dir'] ?? path.join(appRoot, '.agent/artifacts', new Date().toISOString().replaceAll(':', '-')));
    let failed = false;
    for (const platform of platforms) {
      const device = matrixTargets ? matrixTargets.get(platform).name
        : ['validate', 'doctor'].includes(command) || values['dry-run'] ? values.device || platform
        : await resolveDevice({ platform, device: values.device || process.env.FARMSLOT_RECIPE_DEVICE, simulator: process.env.IOS_SIMULATOR, serial: process.env.ADB_SERIAL });
      if (command === 'device') {
        if (!device) throw new Error('No assigned recipe device.');
        console.log(device);
        continue;
      }
      if (!device && command === 'run' && !values['dry-run']) throw new Error('Native proof requires --device or a slot-injected device.');
      const index = await buildDiscoveryIndex({ libraries: [library], platform, handlers: actionNames });
      const requested = recipeName ?? `${domain}.expo.config`;
      const local = path.resolve(requested);
      const exists = isFile;
      const match = exists ? undefined : await findRecipe(index, requested);
      if (!exists && !match) throw new Error(`Unknown recipe: ${requested}`);
      const host = createAudiolabHost({ app, platform, device, projectRoot,
        updateBaselines: values['update-baselines'],
        noHud: values['no-hud'] || requested.endsWith('expo.config') || requested.endsWith('expo.config.recipe.json'),
      });
      const { runner } = host;
      const request = host.request({ recipePath: exists ? local : match.recipe.path,
        artifactsDir: platforms.length > 1 ? path.join(artifactRoot, platform) : artifactRoot,
        params, ...(values.step ? { stopAfterNode: values.step } : {}),
      });
      if (['validate', 'doctor'].includes(command) || values['dry-run']) {
        const plan = await runner.preflight(request);
        console.log(JSON.stringify(command === 'doctor' ? { runner_protocol_version: 1, status: 'pass', checks: [{ id: 'recipe-plan', status: 'pass', message: 'Action manifest and complete recipe dependency graph are ready.' }] } : { status: 'pass', app, platform, plan }, null, 2));
      } else if (command === 'run') {
        const result = await runner.run(request);
        console.log(JSON.stringify(result, null, 2));
        if (result.status === 'fail' && device) {
          await captureFailureDiagnostics({ appRoot, device, platform, artifactsDir: request.artifactsDir }).catch(error => console.error(`Diagnostics unavailable: ${error.message}`));
        }
        failed ||= result.status !== 'pass';
      } else throw new Error(`Unknown command: ${command}`);
    }
    if (failed) process.exitCode = 1;
  }
}
