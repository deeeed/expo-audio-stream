#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '../..');
const BRIDGE_PATH = path.resolve(APP_ROOT, '../../scripts/agentic/cdp-bridge.mjs');
const REPORT_DIR = path.join(APP_ROOT, '.agent', 'reports');
const DEV_CLIENT_PACKAGE = 'net.siteed.sherpavoice.development';
const DEV_CLIENT_ACTIVITY = `${DEV_CLIENT_PACKAGE}/.MainActivity`;
const BENCHMARK_ROUTE = '/features/asr-benchmark';
const AMI_150_170_REFERENCE_TRANSCRIPT =
  'So the the goal is to have a remote control, so to have an advantage over our competitors, we have to be original, we have to be trendy and we have to also try to be user-friendly. So uh the design step will be divided in three';

const BENCHMARK_MODELS = [
  {
    id: 'streaming-zipformer-en-20m-mobile',
    liveCapable: true,
    tier: 'live-mobile',
  },
  {
    id: 'streaming-zipformer-en-general',
    liveCapable: true,
    tier: 'live-general',
  },
  {
    id: 'streaming-zipformer-ctc-small-2024-03-18',
    liveCapable: true,
    tier: 'live-general',
  },
  {
    id: 'streaming-zipformer-bilingual-zh-en-2023-02-20',
    liveCapable: true,
    tier: 'live-general',
  },
  {
    id: 'streaming-paraformer-bilingual-zh-en',
    liveCapable: true,
    tier: 'live-general',
  },
  {
    id: 'streaming-zipformer-en-kroko-2025-08-06',
    liveCapable: true,
    tier: 'live-recent',
  },
  {
    id: 'whisper-tiny-en',
    liveCapable: false,
    tier: 'offline-baseline',
  },
  {
    id: 'whisper-small-multilingual',
    liveCapable: false,
    tier: 'offline-reference',
  },
  {
    id: 'sense-voice-zh-en-ja-ko-yue-int8-2025-09-09',
    liveCapable: false,
    tier: 'offline-reference',
  },
  {
    id: 'zipformer-en-general',
    liveCapable: false,
    tier: 'offline-reference',
  },
  {
    id: 'nemo-canary-180m-flash-en-es-de-fr',
    liveCapable: false,
    tier: 'offline-translation-reference',
  },
];

const LIVE_MODEL_IDS = BENCHMARK_MODELS.filter((model) => model.liveCapable).map(
  (model) => model.id
);

const DEFAULTS = {
  offlineAudioFile:
    '/Volumes/c910ssd/datasets/amicorpus/IS1001a/audio/IS1001a.Mix-Headset.wav',
  offlineDurationSec: 20,
  offlineOffsetSec: 150,
  liveAudioFile:
    '/Volumes/c910ssd/datasets/amicorpus/IS1001a/audio/IS1001a.Mix-Headset.wav',
  liveDurationSec: 20,
  liveOffsetSec: 150,
  pollIntervalMs: 1000,
  postSpeechDelaySec: 2,
  preSpeechDelaySec: 1,
  sampleId: '2',
  sampleTimeoutMs: 10 * 60 * 1000,
  modelDownloadTimeoutMs: 45 * 60 * 1000,
  startupTimeoutMs: 60 * 1000,
  liveStartTimeoutMs: 30 * 1000,
  liveResultTimeoutMs: 60 * 1000,
  useReload: true,
};

function parseArgs(argv) {
  const options = {
    adbSerial: '',
    device: '',
    offlineAudioFile: DEFAULTS.offlineAudioFile,
    offlineDurationSec: DEFAULTS.offlineDurationSec,
    offlineOffsetSec: DEFAULTS.offlineOffsetSec,
    liveAudioFile: DEFAULTS.liveAudioFile,
    liveDurationSec: DEFAULTS.liveDurationSec,
    liveOffsetSec: DEFAULTS.liveOffsetSec,
    pollIntervalMs: DEFAULTS.pollIntervalMs,
    postSpeechDelaySec: DEFAULTS.postSpeechDelaySec,
    preSpeechDelaySec: DEFAULTS.preSpeechDelaySec,
    sampleId: DEFAULTS.sampleId,
    referenceTranscript: '',
    skipDownloads: false,
    skipLive: false,
    skipReload: !DEFAULTS.useReload,
    skipSample: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--device':
        options.device = argv[index + 1] ?? '';
        index += 1;
        break;
      case '--adb-serial':
        options.adbSerial = argv[index + 1] ?? '';
        index += 1;
        break;
      case '--live-audio-file':
        options.liveAudioFile = argv[index + 1] ?? options.liveAudioFile;
        index += 1;
        break;
      case '--offline-audio-file':
        options.offlineAudioFile = argv[index + 1] ?? options.offlineAudioFile;
        index += 1;
        break;
      case '--offline-offset':
        options.offlineOffsetSec = Number(
          argv[index + 1] ?? options.offlineOffsetSec
        );
        index += 1;
        break;
      case '--offline-duration':
        options.offlineDurationSec = Number(
          argv[index + 1] ?? options.offlineDurationSec
        );
        index += 1;
        break;
      case '--live-offset':
        options.liveOffsetSec = Number(argv[index + 1] ?? options.liveOffsetSec);
        index += 1;
        break;
      case '--live-duration':
        options.liveDurationSec = Number(
          argv[index + 1] ?? options.liveDurationSec
        );
        index += 1;
        break;
      case '--sample-id':
        options.sampleId = argv[index + 1] ?? options.sampleId;
        index += 1;
        break;
      case '--reference-transcript':
        options.referenceTranscript = argv[index + 1] ?? options.referenceTranscript;
        index += 1;
        break;
      case '--skip-downloads':
        options.skipDownloads = true;
        break;
      case '--skip-live':
        options.skipLive = true;
        break;
      case '--skip-sample':
        options.skipSample = true;
        break;
      case '--skip-reload':
        options.skipReload = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runCommand(command, args, { parseJson = true } = {}) {
  const result = spawnSync(command, args, {
    cwd: APP_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      APP_ROOT,
    },
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(output || `${command} ${args.join(' ')} failed`);
  }

  const stdout = result.stdout.trim();
  if (!parseJson) return stdout;
  if (!stdout) return null;

  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Failed to parse JSON output: ${stdout}\n${error}`);
  }
}

function createBridgeRunner(device) {
  const baseArgs = [BRIDGE_PATH];
  if (device) {
    baseArgs.push('--device', device);
  }

  function runBridge(args, parseJson) {
    const maxAttempts = 5;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return runCommand('node', [...baseArgs, ...args], { parseJson });
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const shouldRetry =
          message.includes('WebSocket closed') ||
          message.includes('No __AGENTIC__ targets found') ||
          message.includes('No debug targets found') ||
          message.includes('Cannot reach Metro');

        if (!shouldRetry || attempt === maxAttempts) {
          throw error;
        }

        sleepSync(500 * attempt);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  return {
    raw(args) {
      return runBridge(args, false);
    },
    json(args) {
      return runBridge(args, true);
    },
  };
}

function resolveAdbSerial(explicitSerial) {
  if (explicitSerial) return explicitSerial;

  const output = runCommand('adb', ['devices', '-l'], { parseJson: false });
  const deviceLines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith('List of devices attached') &&
        /\bdevice\b/.test(line)
    );

  const physical = deviceLines.filter((line) => !line.includes('emulator-'));
  const selected = physical[0] ?? deviceLines[0];
  if (!selected) {
    throw new Error('No adb devices are connected');
  }

  return selected.split(/\s+/)[0];
}

function runAdb(adbSerial, args) {
  return runCommand('adb', ['-s', adbSerial, ...args], { parseJson: false });
}

function runAdbWithInput(adbSerial, args, input) {
  const result = spawnSync('adb', ['-s', adbSerial, ...args], {
    cwd: APP_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      APP_ROOT,
    },
    input,
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(output || `adb ${args.join(' ')} failed`);
  }

  return result.stdout.trim();
}

async function waitForBridgeTarget(bridge, timeoutMs = DEFAULTS.startupTimeoutMs) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const devices = bridge.json(['list-devices']);
      if ((devices?.count ?? 0) > 0) return devices;
    } catch (error) {
      lastError = error;
    }
    await sleep(DEFAULTS.pollIntervalMs);
  }

  throw new Error(
    `Timed out waiting for CDP target${
      lastError ? `: ${lastError instanceof Error ? lastError.message : String(lastError)}` : ''
    }`
  );
}

async function restartDevClient(adbSerial) {
  console.log(`Restarting dev client on ${adbSerial}...`);
  runAdb(adbSerial, ['reverse', 'tcp:7500', 'tcp:7500']);
  runAdb(adbSerial, ['shell', 'am', 'force-stop', DEV_CLIENT_PACKAGE]);
  runAdb(adbSerial, [
    'shell',
    'am',
    'start',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    'exp+sherpa-voice://expo-development-client/?url=http://127.0.0.1:7500',
    DEV_CLIENT_ACTIVITY,
  ]);
  await sleep(5000);
}

async function recoverBenchmarkSession(bridge, adbSerial) {
  await restartDevClient(adbSerial);
  await waitForBridgeTarget(bridge);
  bridge.json(['navigate', BENCHMARK_ROUTE]);
  await waitForBenchmarkReady(bridge);
}

function getModelStatus(state, modelId) {
  return state?.models?.statuses?.[modelId] ?? null;
}

function summarizeState(state) {
  return {
    pageState: state?.pageState ?? null,
    route: state?.route ?? null,
  };
}

async function waitForState(bridge, predicate, label, timeoutMs, intervalMs) {
  const startedAt = Date.now();
  let lastState = null;
  let lastError = null;
  let noTargetErrors = 0;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      lastState = bridge.json(['get-state']);
      noTargetErrors = 0;
      const result = predicate(lastState);
      if (result) return { result, state: lastState };
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes('No debug targets found') ||
        message.includes('No __AGENTIC__ targets found')
      ) {
        noTargetErrors += 1;
        if (noTargetErrors >= 3) {
          throw new Error(`${label} lost debug target: ${message}`);
        }
      }
    }
    await sleep(intervalMs);
  }

  throw new Error(
    `${label} timed out after ${timeoutMs}ms${
      lastError ? `\n${lastError instanceof Error ? lastError.message : String(lastError)}` : ''
    }\n${JSON.stringify(
      summarizeState(lastState),
      null,
      2
    )}`
  );
}

function makeBenchmarkCrashResult(model, mode, error, runtime, extra = {}) {
  return {
    createdAt: Date.now(),
    error: error instanceof Error ? error.message : String(error),
    mode,
    modelId: model.id,
    modelName: model.name ?? model.id,
    runtime,
    transcript: '',
    ...extra,
  };
}

async function waitForBenchmarkReady(bridge) {
  await waitForState(
    bridge,
    (state) => {
      const route = state?.route;
      const models = state?.models?.statuses ?? {};
      const hasMatrixState = BENCHMARK_MODELS.every((model) => model.id in models);
      return route === BENCHMARK_ROUTE && hasMatrixState;
    },
    'benchmark page state',
    DEFAULTS.startupTimeoutMs,
    DEFAULTS.pollIntervalMs
  );
}

async function waitForSelection(bridge, key, expectedValue) {
  await waitForState(
    bridge,
    (state) => state?.pageState?.[key] === expectedValue,
    `${key}=${expectedValue}`,
    DEFAULTS.startupTimeoutMs,
    DEFAULTS.pollIntervalMs
  );
}

async function clearResults(bridge) {
  const state = bridge.json(['get-state']);
  if ((state?.pageState?.resultsCount ?? 0) === 0) return;

  bridge.json(['press-test-id', 'asr-benchmark-clear-results']);
  await waitForState(
    bridge,
    (nextState) => (nextState?.pageState?.resultsCount ?? 0) === 0,
    'clear benchmark results',
    DEFAULTS.startupTimeoutMs,
    DEFAULTS.pollIntervalMs
  );
}

async function setMode(bridge, mode) {
  const state = bridge.json(['get-state']);
  if (state?.pageState?.mode === mode) return;

  bridge.json([
    'press-test-id',
    mode === 'live' ? 'asr-benchmark-mode-live' : 'asr-benchmark-mode-sample',
  ]);
  await waitForSelection(bridge, 'mode', mode);
}

async function selectBenchmarkModel(bridge, modelId) {
  bridge.json(['press-test-id', `asr-benchmark-model-${modelId}`]);
  await waitForSelection(bridge, 'selectedModelId', modelId);
}

async function selectSample(bridge, sampleId) {
  bridge.json(['press-test-id', `asr-benchmark-sample-${sampleId}`]);
  await waitForSelection(bridge, 'selectedSampleId', sampleId);
}

function clipTranscript(text, maxLength = 180) {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function renderMetric(value, suffix = 'ms') {
  if (value == null) return 'n/a';
  return `${Math.round(value)}${suffix}`;
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function buildClipPath(label = 'clip') {
  return path.join(
    os.tmpdir(),
    `asr-benchmark-${label}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.wav`
  );
}

function createClipFile(filePath, offsetSec, durationSec, label = 'clip') {
  const clipPath = buildClipPath(label);
  runCommand(
    'ffmpeg',
    [
      '-v',
      'error',
      '-y',
      '-ss',
      String(offsetSec),
      '-t',
      String(durationSec),
      '-i',
      filePath,
      '-ac',
      '1',
      '-ar',
      '16000',
      clipPath,
    ],
    { parseJson: false }
  );
  return clipPath;
}

function playSourceAudio(filePath, offsetSec, durationSec) {
  const clipPath = createClipFile(filePath, offsetSec, durationSec, 'live');

  try {
    spawnSync('osascript', ['-e', 'set volume output volume 100'], {
      cwd: APP_ROOT,
      encoding: 'utf8',
    });
    runCommand('afplay', ['-v', '1', clipPath], { parseJson: false });
  } finally {
    fs.rmSync(clipPath, { force: true });
  }
}

function stageClipInAppFiles(adbSerial, hostClipPath, remoteName) {
  const stagingPath = `/data/local/tmp/${remoteName}`;
  const internalDir = `/data/user/0/${DEV_CLIENT_PACKAGE}/files/benchmarks`;
  const internalPath = `${internalDir}/${remoteName}`;

  runAdb(adbSerial, ['push', hostClipPath, stagingPath]);
  runAdb(adbSerial, [
    'shell',
    `run-as ${DEV_CLIENT_PACKAGE} mkdir -p files/benchmarks && run-as ${DEV_CLIENT_PACKAGE} cp ${stagingPath} files/benchmarks/${remoteName} && run-as ${DEV_CLIENT_PACKAGE} chmod 666 files/benchmarks/${remoteName} && rm ${stagingPath}`,
  ]);

  return internalPath;
}

async function waitForLastResult(bridge, op, label, timeoutMs) {
  const startedAt = Date.now();
  let lastError = null;
  let noTargetErrors = 0;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const result = bridge.json([
        'eval',
        'globalThis.__AGENTIC__?.getLastResult?.()',
      ]);
      noTargetErrors = 0;

      if (!result || result.op !== op || result.status === 'pending') {
        await sleep(DEFAULTS.pollIntervalMs);
        continue;
      }

      if (result.status === 'success') {
        return result.result ?? null;
      }

      throw new Error(result.error || `${op} failed`);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes('No debug targets found') ||
        message.includes('No __AGENTIC__ targets found')
      ) {
        noTargetErrors += 1;
        if (noTargetErrors >= 3) {
          throw new Error(`${label} lost debug target: ${message}`);
        }
      }
    }

    await sleep(DEFAULTS.pollIntervalMs);
  }

  throw new Error(
    `${label} timed out after ${timeoutMs}ms${
      lastError ? `: ${lastError instanceof Error ? lastError.message : String(lastError)}` : ''
    }`
  );
}

async function ensureModelDownloaded(bridge, modelId, skipDownloads) {
  let state = bridge.json(['get-state']);
  let status = getModelStatus(state, modelId);
  const startedAt = Date.now();

  if (status?.status === 'downloaded') {
    return {
      attempted: false,
      durationMs: 0,
      error: null,
      finalStatus: status.status,
      modelId,
      progress: status.progress ?? null,
    };
  }

  if (skipDownloads) {
    return {
      attempted: false,
      durationMs: 0,
      error: status?.error ?? 'download skipped',
      finalStatus: status?.status ?? 'missing',
      modelId,
      progress: status?.progress ?? null,
    };
  }

  if (status?.status === 'error' && !status?.localPath) {
    bridge.raw([
      'eval',
      `globalThis.__AGENTIC__?.resetModelState?.(${JSON.stringify(modelId)})`,
    ]);
    await sleep(DEFAULTS.pollIntervalMs);
    state = bridge.json(['get-state']);
    status = getModelStatus(state, modelId);
  }

  if (status?.status !== 'downloading' && status?.status !== 'extracting') {
    console.log(`Downloading ${modelId}...`);
    bridge.raw([
      'eval',
      `globalThis.__AGENTIC__?.downloadModel?.(${JSON.stringify(modelId)})`,
    ]);
  } else {
    console.log(`Waiting for active download ${modelId}...`);
  }

  let previousMarker = '';
  const final = await waitForState(
    bridge,
    (nextState) => {
      const nextStatus = getModelStatus(nextState, modelId);
      const marker = `${nextStatus?.status ?? 'missing'}:${Math.round(
        (nextStatus?.progress ?? 0) * 100
      )}`;
      if (marker !== previousMarker) {
        previousMarker = marker;
        console.log(
          `  ${modelId}: ${nextStatus?.status ?? 'missing'} ${
            nextStatus?.progress != null
              ? `${Math.round(nextStatus.progress * 100)}%`
              : ''
          }`.trim()
        );
      }
      if (!nextStatus) return false;
      return nextStatus.status === 'downloaded' || nextStatus.status === 'error';
    },
    `download ${modelId}`,
    DEFAULTS.modelDownloadTimeoutMs,
    DEFAULTS.pollIntervalMs
  );

  const finalStatus = getModelStatus(final.state, modelId);
  return {
    attempted: true,
    durationMs: Date.now() - startedAt,
    error: finalStatus?.error ?? null,
    finalStatus: finalStatus?.status ?? 'missing',
    modelId,
    progress: finalStatus?.progress ?? null,
  };
}

async function runSampleBenchmark(bridge, modelId, sampleId) {
  await setMode(bridge, 'sample');
  await selectSample(bridge, sampleId);
  await selectBenchmarkModel(bridge, modelId);
  await clearResults(bridge);

  const beforeState = bridge.json(['get-state']);
  const sampleName = beforeState?.pageState?.selectedSampleName ?? sampleId;

  console.log(`Running sample benchmark for ${modelId} on ${sampleName}...`);
  bridge.json(['press-test-id', 'asr-benchmark-run-selected']);

  const { state } = await waitForState(
    bridge,
    (nextState) => {
      const latest = nextState?.pageState?.latestResult;
      if (latest?.mode === 'sample' && latest?.modelId === modelId) {
        return true;
      }
      const processing = nextState?.pageState?.processing === true;
      const error = nextState?.pageState?.error;
      if (!processing && error && (nextState?.pageState?.resultsCount ?? 0) === 0) {
        return true;
      }
      return false;
    },
    `sample benchmark ${modelId}`,
    DEFAULTS.sampleTimeoutMs,
    DEFAULTS.pollIntervalMs
  );

  const latest = state?.pageState?.latestResult;
  if (latest?.mode === 'sample' && latest?.modelId === modelId) {
    return {
      ...latest,
      sampleName,
    };
  }

  return {
    createdAt: Date.now(),
    error: state?.pageState?.error || 'Sample benchmark failed without result',
    mode: 'sample',
    modelId,
    modelName: state?.pageState?.selectedModelName ?? modelId,
    runtime: LIVE_MODEL_IDS.includes(modelId) ? 'streaming' : 'offline',
    sampleName,
    transcript: '',
  };
}

async function runExternalOfflineBenchmark(
  bridge,
  model,
  deviceFileUri,
  sampleName
) {
  console.log(`Running offline file benchmark for ${model.id} on ${sampleName}...`);
  const op = 'benchmarkAsrFile';
  bridge.json([
    'eval',
    `globalThis.__AGENTIC__?.benchmarkAsrFile?.(${JSON.stringify(
      model.id
    )}, ${JSON.stringify(deviceFileUri)})`,
  ]);

  const result = await waitForLastResult(
    bridge,
    op,
    `offline file benchmark ${model.id}`,
    DEFAULTS.sampleTimeoutMs
  );

  return {
    createdAt: Date.now(),
    error: null,
    initMs: result?.initMs ?? null,
    mode: 'sample',
    modelId: model.id,
    modelName: result?.modelName ?? model.name ?? model.id,
    recognizeMs: result?.recognizeMs ?? null,
    runtime: model.liveCapable ? 'streaming' : 'offline',
    sampleName,
    sessionMs:
      result?.initMs != null && result?.recognizeMs != null
        ? result.initMs + result.recognizeMs
        : null,
    transcript: result?.transcript ?? '',
  };
}

async function runLiveBenchmark(bridge, modelId, options) {
  await setMode(bridge, 'live');
  await selectBenchmarkModel(bridge, modelId);
  await clearResults(bridge);

  console.log(`Running live benchmark for ${modelId}...`);
  bridge.json(['press-test-id', 'asr-benchmark-start-live']);

  const startState = await waitForState(
    bridge,
    (nextState) => {
      if (nextState?.pageState?.recorderIsRecording === true) return true;
      if (
        nextState?.pageState?.processing === false &&
        nextState?.pageState?.error &&
        nextState?.pageState?.recorderIsRecording !== true
      ) {
        return true;
      }
      return false;
    },
    `start live benchmark ${modelId}`,
    DEFAULTS.liveStartTimeoutMs,
    DEFAULTS.pollIntervalMs
  );

  if (startState.state?.pageState?.recorderIsRecording !== true) {
    return {
      createdAt: Date.now(),
      error:
        startState.state?.pageState?.error || 'Live benchmark failed to start',
      mode: 'live',
      modelId,
      modelName: startState.state?.pageState?.selectedModelName ?? modelId,
      runtime: 'streaming',
      transcript: '',
    };
  }

  await sleep(options.preSpeechDelaySec * 1000);
  playSourceAudio(
    options.liveAudioFile,
    options.liveOffsetSec,
    options.liveDurationSec
  );
  await sleep(options.postSpeechDelaySec * 1000);

  bridge.json(['press-test-id', 'asr-benchmark-stop-live']);
  await waitForState(
    bridge,
    (nextState) => nextState?.pageState?.recorderIsRecording === false,
    `stop live benchmark ${modelId}`,
    DEFAULTS.liveStartTimeoutMs,
    DEFAULTS.pollIntervalMs
  );

  const final = await waitForState(
    bridge,
    (nextState) => {
      const latest = nextState?.pageState?.latestResult;
      return latest?.mode === 'live' && latest?.modelId === modelId;
    },
    `live benchmark result ${modelId}`,
    DEFAULTS.liveResultTimeoutMs,
    DEFAULTS.pollIntervalMs
  );

  return final.state?.pageState?.latestResult ?? {
    createdAt: Date.now(),
    error: 'Live benchmark finished without result',
    mode: 'live',
    modelId,
    modelName: final.state?.pageState?.selectedModelName ?? modelId,
    runtime: 'streaming',
    transcript: '',
  };
}

function buildLiveVerdict(result) {
  if (result.error) return 'failed';
  if (result.firstPartialMs == null || result.firstCommitMs == null) {
    return 'no usable live output';
  }
  if (result.firstPartialMs <= 700 && result.firstCommitMs <= 1500) {
    return 'recorder-like latency';
  }
  if (result.firstPartialMs <= 1500 && result.firstCommitMs <= 3000) {
    return 'usable but behind recorder';
  }
  return 'far behind recorder';
}

function normalizeForWordAlignment(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9'\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForCharAlignment(text) {
  return normalizeForWordAlignment(text).replace(/\s+/g, '');
}

function editDistance(left, right) {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[rows - 1][cols - 1];
}

function scoreTranscript(transcript, referenceTranscript) {
  if (!referenceTranscript) return null;

  const referenceWords = normalizeForWordAlignment(referenceTranscript)
    .split(' ')
    .filter(Boolean);
  const hypothesisWords = normalizeForWordAlignment(transcript)
    .split(' ')
    .filter(Boolean);
  const referenceChars = normalizeForCharAlignment(referenceTranscript);
  const hypothesisChars = normalizeForCharAlignment(transcript);

  const wordDistance = editDistance(referenceWords, hypothesisWords);
  const charDistance = editDistance(referenceChars, hypothesisChars);
  const wordDenominator = Math.max(referenceWords.length, 1);
  const charDenominator = Math.max(referenceChars.length, 1);

  return {
    referenceCharCount: referenceChars.length,
    referenceWordCount: referenceWords.length,
    charDistance,
    cer: charDistance / charDenominator,
    wordDistance,
    wer: wordDistance / wordDenominator,
  };
}

function attachScores(results, referenceTranscript) {
  return results.map((result) => ({
    ...result,
    score:
      result.error || !result.transcript
        ? null
        : scoreTranscript(result.transcript, referenceTranscript),
  }));
}

function renderPercent(value) {
  if (value == null) return 'n/a';
  return `${(value * 100).toFixed(1)}%`;
}

function compareRankedResults(a, b) {
  if (a.error && !b.error) return 1;
  if (!a.error && b.error) return -1;

  const aWer = a.score?.wer;
  const bWer = b.score?.wer;
  if (aWer != null && bWer != null && aWer !== bWer) {
    return aWer - bWer;
  }

  const aLatency = a.firstCommitMs ?? a.recognizeMs ?? Number.MAX_SAFE_INTEGER;
  const bLatency = b.firstCommitMs ?? b.recognizeMs ?? Number.MAX_SAFE_INTEGER;
  if (aLatency !== bLatency) {
    return aLatency - bLatency;
  }

  return String(a.modelId).localeCompare(String(b.modelId));
}

function rankTopResult(results) {
  const ranked = [...results].sort(compareRankedResults);
  return ranked[0] ?? null;
}

function resolveReferenceTranscript(options) {
  if (options.referenceTranscript) {
    return options.referenceTranscript.trim();
  }

  const audioPath = path.resolve(options.offlineAudioFile);
  const expectedPath = path.resolve(
    '/Volumes/c910ssd/datasets/amicorpus/IS1001a/audio/IS1001a.Mix-Headset.wav'
  );
  if (
    audioPath === expectedPath &&
    options.offlineOffsetSec === 150 &&
    options.offlineDurationSec === 20
  ) {
    return AMI_150_170_REFERENCE_TRANSCRIPT;
  }

  return '';
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# ASR Benchmark Report');
  lines.push('');
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Device filter: ${report.deviceFilter || 'auto'}`);
  lines.push(`- Route: ${report.route}`);
  lines.push(
    `- Offline source: ${report.sample.sampleName} (${report.sample.sampleId})`
  );
  lines.push(
    `- Offline source file: ${report.sample.audioFile || 'bundled sample'}`
  );
  if (report.sample.offsetSec != null && report.sample.durationSec != null) {
    lines.push(
      `- Offline clip window: ${report.sample.offsetSec}s for ${report.sample.durationSec}s`
    );
  }
  lines.push(
    `- Live source: ${report.live.audioFile} @ ${report.live.offsetSec}s for ${report.live.durationSec}s`
  );
  if (report.referenceTranscript) {
    lines.push(`- Reference transcript: ${report.referenceTranscript}`);
  }
  lines.push('');

  lines.push('## Downloads');
  lines.push('');
  lines.push('| Model | Final status | Duration | Error |');
  lines.push('| --- | --- | --- | --- |');
  for (const item of report.downloads) {
    lines.push(
      `| ${escapeCell(item.modelId)} | ${escapeCell(item.finalStatus)} | ${escapeCell(
        renderMetric(item.durationMs)
      )} | ${escapeCell(item.error || '')} |`
    );
  }
  lines.push('');

  lines.push('## Sample Matrix');
  lines.push('');
  lines.push('| Model | Runtime | WER | CER | Init | Recognize | Error | Transcript |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const item of report.sample.results) {
    lines.push(
      `| ${escapeCell(item.modelName || item.modelId)} | ${escapeCell(
        item.runtime || ''
      )} | ${escapeCell(renderPercent(item.score?.wer))} | ${escapeCell(
        renderPercent(item.score?.cer)
      )} | ${escapeCell(renderMetric(item.initMs))} | ${escapeCell(
        renderMetric(item.recognizeMs)
      )} | ${escapeCell(item.error || '')} | ${escapeCell(
        clipTranscript(item.transcript)
      )} |`
    );
  }
  lines.push('');

  lines.push('## Live Matrix');
  lines.push('');
  lines.push('| Model | Verdict | WER | CER | Init | First partial | First commit | Session | Error | Transcript |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const item of report.live.results) {
    lines.push(
      `| ${escapeCell(item.modelName || item.modelId)} | ${escapeCell(
        buildLiveVerdict(item)
      )} | ${escapeCell(renderPercent(item.score?.wer))} | ${escapeCell(
        renderPercent(item.score?.cer)
      )} | ${escapeCell(renderMetric(item.initMs))} | ${escapeCell(
        renderMetric(item.firstPartialMs)
      )} | ${escapeCell(renderMetric(item.firstCommitMs))} | ${escapeCell(
        renderMetric(item.sessionMs)
      )} | ${escapeCell(item.error || '')} | ${escapeCell(
        clipTranscript(item.transcript)
      )} |`
    );
  }
  lines.push('');

  lines.push('## Winners');
  lines.push('');
  if (report.summary.bestSample) {
    lines.push(
      `- Best offline/sample result: ${report.summary.bestSample.modelId} (WER ${renderPercent(
        report.summary.bestSample.score?.wer
      )}, recognize ${renderMetric(report.summary.bestSample.recognizeMs)})`
    );
  }
  if (report.summary.bestLive) {
    lines.push(
      `- Best live result: ${report.summary.bestLive.modelId} (WER ${renderPercent(
        report.summary.bestLive.score?.wer
      )}, first partial ${renderMetric(
        report.summary.bestLive.firstPartialMs
      )}, first commit ${renderMetric(report.summary.bestLive.firstCommitMs)})`
    );
  }
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push(`- Download failures: ${report.summary.downloadFailures.join(', ') || 'none'}`);
  lines.push(`- Sample failures: ${report.summary.sampleFailures.join(', ') || 'none'}`);
  lines.push(`- Live failures: ${report.summary.liveFailures.join(', ') || 'none'}`);
  lines.push(
    `- Live models far behind Recorder target: ${report.summary.liveFarBehind.join(', ') || 'none'}`
  );
  lines.push('');

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv);
  const adbSerial = resolveAdbSerial(options.adbSerial);

  if (!fs.existsSync(options.offlineAudioFile) && !options.skipSample) {
    throw new Error(`Offline audio file not found: ${options.offlineAudioFile}`);
  }

  if (!fs.existsSync(options.liveAudioFile) && !options.skipLive) {
    throw new Error(`Live audio file not found: ${options.liveAudioFile}`);
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const bridge = createBridgeRunner(options.device);
  runAdb(adbSerial, ['reverse', 'tcp:7500', 'tcp:7500']);

  if (!options.skipReload) {
    console.log('Reloading app bundle...');
    bridge.raw(['reload']);
    await sleep(3000);
  }

  await waitForBridgeTarget(bridge);
  console.log('Navigating to benchmark page...');
  bridge.json(['navigate', BENCHMARK_ROUTE]);
  await waitForBenchmarkReady(bridge);

  const referenceTranscript = resolveReferenceTranscript(options);

  const downloads = [];
  for (const model of BENCHMARK_MODELS) {
    const download = await ensureModelDownloaded(
      bridge,
      model.id,
      options.skipDownloads
    );
    downloads.push(download);
  }

  await waitForBenchmarkReady(bridge);

  const sampleState = bridge.json(['get-state']);
  const bundledSampleId = options.sampleId;
  const bundledSampleName =
    sampleState?.pageState?.selectedSampleId === bundledSampleId
      ? sampleState?.pageState?.selectedSampleName ?? bundledSampleId
      : bundledSampleId;
  const offlineClipName = `AMI IS1001a @ ${options.offlineOffsetSec}s + ${options.offlineDurationSec}s`;
  const resolvedSampleId = options.offlineAudioFile ? 'external-ami-clip' : bundledSampleId;
  const resolvedSampleName = options.offlineAudioFile
    ? offlineClipName
    : bundledSampleName;
  let deviceOfflineFileUri = null;
  let hostOfflineClipPath = null;

  const sampleResults = [];
  if (!options.skipSample) {
    hostOfflineClipPath = createClipFile(
      options.offlineAudioFile,
      options.offlineOffsetSec,
      options.offlineDurationSec,
      'offline'
    );
    const remoteName = path.basename(hostOfflineClipPath);
    deviceOfflineFileUri = stageClipInAppFiles(
      adbSerial,
      hostOfflineClipPath,
      remoteName
    );

    for (const model of BENCHMARK_MODELS) {
      const status = getModelStatus(bridge.json(['get-state']), model.id);
      if (status?.status !== 'downloaded') {
        sampleResults.push({
          createdAt: Date.now(),
          error: `Model not downloaded: ${status?.status ?? 'missing'}`,
          mode: 'sample',
          modelId: model.id,
          modelName: status?.name ?? model.id,
          runtime: model.liveCapable ? 'streaming' : 'offline',
          sampleName: resolvedSampleName,
          transcript: '',
        });
        continue;
      }
      try {
        sampleResults.push(
          options.offlineAudioFile
            ? await runExternalOfflineBenchmark(
                bridge,
                model,
                deviceOfflineFileUri,
                resolvedSampleName
              )
            : await runSampleBenchmark(bridge, model.id, resolvedSampleId)
        );
      } catch (error) {
        sampleResults.push(
          makeBenchmarkCrashResult(
            { id: model.id, name: status?.name ?? model.id },
            'sample',
            error,
            model.liveCapable ? 'streaming' : 'offline',
            { sampleName: resolvedSampleName }
          )
        );
        await recoverBenchmarkSession(bridge, adbSerial);
      }
    }
  }

  const liveResults = [];
  if (!options.skipLive) {
    for (const modelId of LIVE_MODEL_IDS) {
      const status = getModelStatus(bridge.json(['get-state']), modelId);
      if (status?.status !== 'downloaded') {
        liveResults.push({
          createdAt: Date.now(),
          error: `Model not downloaded: ${status?.status ?? 'missing'}`,
          mode: 'live',
          modelId,
          modelName: status?.name ?? modelId,
          runtime: 'streaming',
          transcript: '',
        });
        continue;
      }
      try {
        liveResults.push(await runLiveBenchmark(bridge, modelId, options));
      } catch (error) {
        liveResults.push(
          makeBenchmarkCrashResult(
            { id: modelId, name: status?.name ?? modelId },
            'live',
            error,
            'streaming'
          )
        );
        await recoverBenchmarkSession(bridge, adbSerial);
      }
    }
  }

  const scoredSampleResults = attachScores(sampleResults, referenceTranscript);
  const scoredLiveResults = attachScores(liveResults, referenceTranscript);
  const bestSample = rankTopResult(
    scoredSampleResults.filter((item) => !item.error && item.transcript)
  );
  const bestLive = rankTopResult(
    scoredLiveResults.filter((item) => !item.error && item.transcript)
  );

  const report = {
    generatedAt: new Date().toISOString(),
    deviceFilter: options.device,
    route: bridge.json(['get-state'])?.route ?? null,
    downloads,
    sample: {
      audioFile: options.offlineAudioFile || null,
      deviceFileUri: deviceOfflineFileUri,
      durationSec: options.offlineDurationSec,
      offsetSec: options.offlineOffsetSec,
      results: scoredSampleResults,
      sampleId: resolvedSampleId,
      sampleName: resolvedSampleName,
    },
    live: {
      audioFile: options.liveAudioFile,
      durationSec: options.liveDurationSec,
      offsetSec: options.liveOffsetSec,
      results: scoredLiveResults,
    },
    referenceTranscript,
    summary: {
      bestLive,
      bestSample,
      downloadFailures: downloads
        .filter((item) => item.finalStatus !== 'downloaded')
        .map((item) => item.modelId),
      sampleFailures: scoredSampleResults
        .filter((item) => item.error)
        .map((item) => item.modelId),
      liveFailures: scoredLiveResults
        .filter((item) => item.error)
        .map((item) => item.modelId),
      liveFarBehind: scoredLiveResults
        .filter((item) => buildLiveVerdict(item) === 'far behind recorder')
        .map((item) => item.modelId),
    },
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(REPORT_DIR, `asr-benchmark-report-${stamp}.json`);
  const markdownPath = path.join(REPORT_DIR, `asr-benchmark-report-${stamp}.md`);

  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderMarkdown(report));

  if (hostOfflineClipPath) {
    fs.rmSync(hostOfflineClipPath, { force: true });
  }

  console.log(`JSON report: ${jsonPath}`);
  console.log(`Markdown report: ${markdownPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
