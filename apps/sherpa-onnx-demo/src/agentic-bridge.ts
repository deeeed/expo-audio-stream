/**
 * Agentic CDP Bridge — app-side runtime for CDP-based automation.
 *
 * Installs `globalThis.__AGENTIC__` with navigate, getRoute, getState,
 * and sherpa-onnx-specific test methods (fire-and-store pattern).
 * Only active in __DEV__ mode. Import this file from _layout.tsx for side effects.
 *
 * Route and model state is kept in sync by the AgenticBridgeSync component.
 * CDP uses awaitPromise:false, so async results are stored and polled via getLastResult().
 */

import { Platform } from 'react-native'
import { router } from 'expo-router'
import * as FileSystem from 'expo-file-system/legacy'
import AsyncStorage from '@react-native-async-storage/async-storage'
import SherpaOnnx, { ASR, AudioTagging, SpeakerId } from '@siteed/sherpa-onnx.rn'

// Platform-aware model base directory
const MODELS_BASE = Platform.OS === 'android'
  ? '/data/data/com.deeeed.sherpaonnxdemo/files/models'
  : `${(FileSystem.documentDirectory ?? '').replace('file://', '')}models`

// State holders updated by AgenticBridgeSync component
let _routeInfo: { pathname: string; segments: string[] } = {
  pathname: '',
  segments: [],
}
let _modelState: Record<string, unknown> = {}
let _pageState: Record<string, unknown> = {}

export function setAgenticRouteInfo(pathname: string, segments: string[]) {
  _routeInfo = { pathname, segments }
}

export function setAgenticModelState(state: Record<string, unknown>) {
  _modelState = state
}

/**
 * Pages call this to register their current UI state for agentic querying.
 * Replaces screenshots — agent calls getPageState() to read state as JSON.
 */
export function setAgenticPageState(state: Record<string, unknown>) {
  _pageState = state
}

// --- Async result store for fire-and-store pattern (CDP awaitPromise:false) ---
let _lastAsyncResult: {
  op: string
  status: 'pending' | 'success' | 'error'
  result?: unknown
  error?: string
} | null = null

if (__DEV__) {
  ;(globalThis as Record<string, unknown>).__AGENTIC__ = {
    platform: Platform.OS,

    navigate: (path: string) => {
      try {
        router.push(path as never)
        return true
      } catch (e) {
        return { error: String(e) }
      }
    },

    getRoute: () => {
      return _routeInfo
    },

    getState: () => {
      return _modelState
    },

    getPageState: () => {
      return { route: _routeInfo.pathname, ..._pageState }
    },

    clearAllModelStates: () => {
      const STORAGE_KEY = '@model_states'
      _lastAsyncResult = { op: 'clearAllModelStates', status: 'pending' }
      AsyncStorage.removeItem(STORAGE_KEY).then(() => {
        _lastAsyncResult = { op: 'clearAllModelStates', status: 'success', result: 'Cleared all model states' }
      }).catch(e => {
        _lastAsyncResult = { op: 'clearAllModelStates', status: 'error', error: String(e) }
      })
      return { op: 'clearAllModelStates', status: 'pending' }
    },

    resetModelState: (modelId: string) => {
      const STORAGE_KEY = '@model_states'
      AsyncStorage.getItem(STORAGE_KEY).then(raw => {
        const states = JSON.parse(raw || '{}')
        delete states[modelId]
        return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(states))
      }).then(() => {
        _lastAsyncResult = { op: 'resetModelState', status: 'success', result: `Cleared ${modelId}` }
      }).catch(e => {
        _lastAsyncResult = { op: 'resetModelState', status: 'error', error: String(e) }
      })
      _lastAsyncResult = { op: 'resetModelState', status: 'pending' }
      return { op: 'resetModelState', status: 'pending' }
    },

    canGoBack: () => {
      return router.canGoBack()
    },

    goBack: () => {
      router.back()
      return true
    },

    // Force release ASR at native level — use before navigating to asr screen
    // to ensure clean state regardless of previous JS-side initialized flag
    releaseAsr: () => {
      const op = 'releaseAsr'
      _lastAsyncResult = { op, status: 'pending' }
      void (async () => {
        try {
          await ASR.release()
          _lastAsyncResult = { op, status: 'success', result: 'released' }
        } catch (e) {
          // Ignore — may not be initialized
          _lastAsyncResult = { op, status: 'success', result: 'not initialized' }
        }
      })()
      return { op, status: 'pending' }
    },

    pressTestId: (testId: string) => {
      try {
        const hook = (globalThis as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ as Record<string, unknown> | undefined
        if (!hook) return { ok: false, error: '__REACT_DEVTOOLS_GLOBAL_HOOK__ not found' }

        const renderers = hook.renderers as Map<number, unknown> | undefined
        if (!renderers) return { ok: false, error: 'No renderers found' }

        const getFiberRoots = hook.getFiberRoots as ((id: number) => Set<Record<string, unknown>>) | undefined

        const walkFiber = (fiber: Record<string, unknown> | null): boolean => {
          if (!fiber) return false
          const props = fiber.memoizedProps as Record<string, unknown> | null
          if (props?.testID === testId) {
            const onPress = props?.onPress as ((...args: unknown[]) => unknown) | undefined
            if (typeof onPress === 'function') {
              onPress()
              return true
            }
          }
          if (walkFiber(fiber.child as Record<string, unknown> | null)) return true
          if (walkFiber(fiber.sibling as Record<string, unknown> | null)) return true
          return false
        }

        for (let id = 1; id <= 3; id++) {
          if (!renderers.get(id)) continue
          const fiberRoots = getFiberRoots ? getFiberRoots(id) : undefined
          if (!fiberRoots) continue
          let found = false
          fiberRoots.forEach((root) => {
            if (!found) {
              found = walkFiber(root.current as Record<string, unknown> | null)
            }
          })
          if (found) return { ok: true, testId }
        }
        return { ok: false, error: `No component with testID="${testId}" found or no onPress prop` }
      } catch (e) {
        return { ok: false, error: String(e) }
      }
    },

    // --- Native module validation tests (fire-and-store pattern) ---

    getLastResult: () => {
      return _lastAsyncResult
    },

    testSystemInfo: () => {
      const op = 'systemInfo'
      _lastAsyncResult = { op, status: 'pending' }
      void (async () => {
        try {
          const result = await SherpaOnnx.getSystemInfo()
          _lastAsyncResult = { op, status: 'success', result }
        } catch (e) {
          _lastAsyncResult = { op, status: 'error', error: String(e) }
        }
      })()
      return { op, status: 'pending' }
    },

    testValidateLib: () => {
      const op = 'validateLib'
      _lastAsyncResult = { op, status: 'pending' }
      void (async () => {
        try {
          const result = await SherpaOnnx.validateLibraryLoaded()
          _lastAsyncResult = { op, status: 'success', result }
        } catch (e) {
          _lastAsyncResult = { op, status: 'error', error: String(e) }
        }
      })()
      return { op, status: 'pending' }
    },

    testTTS: (text = 'Hello from sherpa-onnx agentic test.') => {
      const op = 'tts'
      _lastAsyncResult = { op, status: 'pending' }
      void (async () => {
        try {
          // Generate TTS without a model init — will fail if no model loaded
          // This tests the bridge is reachable; model must be loaded in the app first
          const result = await SherpaOnnx.generateTts({
            text,
            speakerId: 0,
            speakingRate: 1.0,
            playAudio: false,
          })
          _lastAsyncResult = { op, status: 'success', result }
        } catch (e) {
          _lastAsyncResult = { op, status: 'error', error: String(e) }
        }
      })()
      return { op, status: 'pending' }
    },

    testASR: (filePath?: string) => {
      const op = 'asr'
      _lastAsyncResult = { op, status: 'pending' }
      void (async () => {
        try {
          if (!filePath) {
            throw new Error(
              'testASR requires a filePath. Pass an audio file URI from the device.'
            )
          }
          const result = await SherpaOnnx.recognizeFromFile(filePath)
          _lastAsyncResult = { op, status: 'success', result }
        } catch (e) {
          _lastAsyncResult = { op, status: 'error', error: String(e) }
        }
      })()
      return { op, status: 'pending' }
    },

    testAudioTagging: (filePath?: string) => {
      const op = 'audioTagging'
      _lastAsyncResult = { op, status: 'pending' }
      void (async () => {
        try {
          if (!filePath) {
            throw new Error(
              'testAudioTagging requires a filePath. Pass an audio file URI from the device.'
            )
          }
          const result = await SherpaOnnx.processAndComputeAudioTagging(filePath)
          _lastAsyncResult = { op, status: 'success', result }
        } catch (e) {
          _lastAsyncResult = { op, status: 'error', error: String(e) }
        }
      })()
      return { op, status: 'pending' }
    },

    // Full end-to-end TTS: init model → generate → release → timing
    testTTSFull: (text = 'Hello from sherpa onnx.', modelDir?: string) => {
      const op = 'ttsFull'
      const BASE = MODELS_BASE
      const defaultModelDir = `${BASE}/vits-icefall-en-low/vits-icefall-en_US-ljspeech-low`
      const dir = modelDir ?? defaultModelDir
      _lastAsyncResult = { op, status: 'pending' }
      void (async () => {
        const timing: Record<string, number> = {}
        try {
          const t0 = Date.now()
          const initResult = await SherpaOnnx.initTts({
            modelDir: dir,
            modelType: 'vits',
            modelFile: 'model.onnx',
            tokensFile: 'tokens.txt',
            dataDir: 'espeak-ng-data',
            numThreads: 1,
            debug: false,
          })
          timing.initMs = Date.now() - t0
          if (!initResult.success) throw new Error('initTts failed: ' + initResult.error)

          const t1 = Date.now()
          const genResult = await SherpaOnnx.generateTts({
            text,
            speakerId: 0,
            speakingRate: 1.0,
            playAudio: false,
          })
          timing.generateMs = Date.now() - t1

          const t2 = Date.now()
          await SherpaOnnx.releaseTts()
          timing.releaseMs = Date.now() - t2

          _lastAsyncResult = {
            op,
            status: 'success',
            result: { genResult, timing, text, modelDir: dir },
          }
        } catch (e) {
          _lastAsyncResult = { op, status: 'error', error: String(e), result: { timing } }
        }
      })()
      return { op, status: 'pending' }
    },

    // Test any TTS model by ID using predefined config (modelId → config lookup)
    testTTSModel: (modelId: string, text = 'Hello from sherpa onnx.') => {
      const op = 'ttsModel'
      const BASE = MODELS_BASE
      // Inline configs for all 5 TTS models
      const CONFIGS: Record<string, { dir: string; modelType: string; modelFile: string; tokensFile: string; lexiconFile?: string; voicesFile?: string; vocoderFile?: string; dataDir?: string; lang?: string }> = {
        'vits-icefall-en-low': { dir: `${BASE}/vits-icefall-en-low`, modelType: 'vits', modelFile: 'model.onnx', tokensFile: 'tokens.txt', dataDir: 'espeak-ng-data' },
        'vits-piper-en-medium': { dir: `${BASE}/vits-piper-en-medium`, modelType: 'vits', modelFile: 'en_US-ljspeech-medium.onnx', tokensFile: 'tokens.txt', lexiconFile: 'lexicon.txt', dataDir: 'espeak-ng-data' },
        'vits-piper-en-libritts_r-medium': { dir: `${BASE}/vits-piper-en-libritts_r-medium`, modelType: 'vits', modelFile: 'en_US-libritts_r-medium.onnx', tokensFile: 'tokens.txt', dataDir: 'espeak-ng-data' },
        'kokoro-en': { dir: `${BASE}/kokoro-en`, modelType: 'kokoro', modelFile: 'model.onnx', tokensFile: 'tokens.txt', voicesFile: 'voices.bin', dataDir: 'espeak-ng-data' },
        'kokoro-multi-lang-v1_1': { dir: `${BASE}/kokoro-multi-lang-v1_1`, modelType: 'kokoro', modelFile: 'model.onnx', tokensFile: 'tokens.txt', voicesFile: 'voices.bin', dataDir: 'espeak-ng-data', lang: 'en' },
        'matcha-icefall-en': { dir: `${BASE}/matcha-icefall-en`, modelType: 'matcha', modelFile: 'matcha-icefall-en_US-ljspeech/model-steps-3.onnx', tokensFile: 'matcha-icefall-en_US-ljspeech/tokens.txt', vocoderFile: 'vocos-22khz-univ.onnx', dataDir: 'matcha-icefall-en_US-ljspeech/espeak-ng-data' },
      }
      const cfg = CONFIGS[modelId]
      if (!cfg) {
        _lastAsyncResult = { op, status: 'error', error: `Unknown modelId: ${modelId}. Valid: ${Object.keys(CONFIGS).join(', ')}` }
        return { op, status: 'error' }
      }
      _lastAsyncResult = { op, status: 'pending' }
      void (async () => {
        const timing: Record<string, number> = {}
        try {
          const t0 = Date.now()
          const initResult = await SherpaOnnx.initTts({
            modelDir: cfg.dir,
            ttsModelType: cfg.modelType as 'vits' | 'kokoro' | 'matcha',
            modelFile: cfg.modelFile,
            tokensFile: cfg.tokensFile,
            lexiconFile: cfg.lexiconFile,
            voicesFile: cfg.voicesFile,
            vocoderFile: cfg.vocoderFile,
            dataDir: cfg.dataDir,
            lang: cfg.lang,
            numThreads: 1,
            debug: false,
          })
          timing.initMs = Date.now() - t0
          if (!initResult.success) throw new Error('initTts failed: ' + (initResult as Record<string, unknown>).error)

          const t1 = Date.now()
          const genResult = await SherpaOnnx.generateTts({
            text,
            speakerId: 0,
            speakingRate: 1.0,
            playAudio: false,
          })
          timing.generateMs = Date.now() - t1

          const t2 = Date.now()
          await SherpaOnnx.releaseTts()
          timing.releaseMs = Date.now() - t2

          _lastAsyncResult = {
            op,
            status: 'success',
            result: { initResult, genResult, timing, modelId, text },
          }
        } catch (e) {
          _lastAsyncResult = { op, status: 'error', error: String(e), result: { timing } }
        }
      })()
      return { op, status: 'pending' }
    },

    // Full end-to-end Audio Tagging: init model → process file → release → timing
    testAudioTaggingFull: (wavPath?: string, modelDir?: string) => {
      const op = 'audioTaggingFull'
      const BASE = MODELS_BASE
      const defaultModelDir = `${BASE}/ced-tiny-audio-tagging/sherpa-onnx-ced-tiny-audio-tagging-2024-04-19`
      const defaultWav = defaultModelDir + '/test_wavs/1.wav'
      const dir = modelDir ?? defaultModelDir
      const wav = wavPath ?? defaultWav
      _lastAsyncResult = { op, status: 'pending' }
      void (async () => {
        const timing: Record<string, number> = {}
        try {
          const t0 = Date.now()
          const initResult = await SherpaOnnx.initAudioTagging({
            modelDir: dir,
            modelType: 'ced',
            modelFile: 'model.int8.onnx',
            labelsFile: 'class_labels_indices.csv',
            topK: 5,
            numThreads: 1,
            debug: false,
          })
          timing.initMs = Date.now() - t0
          if (!initResult.success) throw new Error('initAudioTagging failed: ' + initResult.error)

          const t1 = Date.now()
          const tagResult = await SherpaOnnx.processAndComputeAudioTagging(wav)
          timing.inferenceMs = Date.now() - t1

          const t2 = Date.now()
          await SherpaOnnx.releaseAudioTagging()
          timing.releaseMs = Date.now() - t2

          _lastAsyncResult = {
            op,
            status: 'success',
            result: { tagResult, timing, wavPath: wav, modelDir: dir },
          }
        } catch (e) {
          _lastAsyncResult = { op, status: 'error', error: String(e), result: { timing } }
        }
      })()
      return { op, status: 'pending' }
    },

    // Full end-to-end offline ASR (whisper): init → recognize → release → timing
    testOfflineASRFull: (modelDir?: string, wavPath?: string) => {
      const op = 'offlineAsrFull'
      const BASE = MODELS_BASE
      const defaultModelDir = `${BASE}/whisper-small-multilingual/sherpa-onnx-whisper-small`
      const defaultWav = defaultModelDir + '/test_wavs/0.wav'
      const dir = modelDir ?? defaultModelDir
      const wav = wavPath ?? defaultWav
      _lastAsyncResult = { op, status: 'pending' }
      void (async () => {
        const timing: Record<string, number> = {}
        try {
          const t0 = Date.now()
          const initResult = await ASR.initialize({
            modelDir: dir,
            modelType: 'whisper',
            numThreads: 2,
            decodingMethod: 'greedy_search',
            streaming: false,
            debug: false,
            modelFiles: {
              encoder: 'small-encoder.int8.onnx',
              decoder: 'small-decoder.int8.onnx',
              tokens: 'small-tokens.txt',
            },
          })
          timing.initMs = Date.now() - t0
          if (!initResult.success) throw new Error('initAsr failed: ' + initResult.error)

          const t1 = Date.now()
          const asrResult = await ASR.recognizeFromFile(wav)
          timing.inferenceMs = Date.now() - t1

          const t2 = Date.now()
          await ASR.release()
          timing.releaseMs = Date.now() - t2

          _lastAsyncResult = {
            op,
            status: 'success',
            result: { transcript: asrResult, timing, wavPath: wav, modelDir: dir },
          }
        } catch (e) {
          _lastAsyncResult = { op, status: 'error', error: String(e), result: { timing } }
        }
      })()
      return { op, status: 'pending' }
    },

    // Full end-to-end Speaker ID: download model → init → extract embedding → register → identify → release
    testSpeakerIdFull: (wavPath?: string) => {
      const op = 'speakerIdFull'
      // Model: campplus English speaker ID (~10MB .onnx)
      const MODEL_URL =
        'https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx'
      const BASE = FileSystem.documentDirectory + 'models/speaker-id/'
      const MODEL_FILE = BASE + 'campplus_en.onnx'
      // Use the zipformer test wav (16kHz speech) since no dedicated test wav for speaker ID
      const ZIPFORMER_DIR =
        `${MODELS_BASE}/streaming-zipformer-en-20m-mobile/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17-mobile`
      const wav = wavPath ?? ZIPFORMER_DIR + '/test_wavs/0.wav'
      _lastAsyncResult = { op, status: 'pending' }
      void (async () => {
        const timing: Record<string, number> = {}
        try {
          // Step 1: ensure model file is downloaded
          const t0 = Date.now()
          await FileSystem.makeDirectoryAsync(BASE, { intermediates: true })
          const info = await FileSystem.getInfoAsync(MODEL_FILE)
          if (!info.exists) {
            await FileSystem.downloadAsync(MODEL_URL, MODEL_FILE)
          }
          timing.downloadMs = Date.now() - t0

          // Step 2: init speaker ID
          const t1 = Date.now()
          const modelDir = BASE.replace('file://', '')
          const initResult = await SpeakerId.init({
            modelDir,
            modelFile: 'campplus_en.onnx',
            numThreads: 2,
            debug: false,
            provider: 'cpu',
          })
          timing.initMs = Date.now() - t1
          if (!initResult.success) throw new Error('initSpeakerId failed: ' + initResult.error)

          // Step 3: extract embedding from wav
          const t2 = Date.now()
          const embedResult = await SpeakerId.processFile(wav)
          timing.embedMs = Date.now() - t2
          if (!embedResult.success) throw new Error('processSpeakerIdFile failed: ' + embedResult.error)

          // Step 4: register speaker
          const t3 = Date.now()
          const regResult = await SpeakerId.registerSpeaker('AgentSpeaker', embedResult.embedding)
          timing.registerMs = Date.now() - t3
          if (!regResult.success) throw new Error('registerSpeaker failed: ' + regResult.error)

          // Step 5: identify speaker
          const t4 = Date.now()
          const idResult = await SpeakerId.identifySpeaker(embedResult.embedding, 0.5)
          timing.identifyMs = Date.now() - t4

          // Step 6: list speakers
          const speakers = await SpeakerId.getSpeakers()

          // Step 7: release
          const t5 = Date.now()
          await SpeakerId.release()
          timing.releaseMs = Date.now() - t5

          _lastAsyncResult = {
            op,
            status: 'success',
            result: { embedResult, idResult, speakers, timing, wavPath: wav },
          }
        } catch (e) {
          _lastAsyncResult = { op, status: 'error', error: String(e), result: { timing } }
        }
      })()
      return { op, status: 'pending' }
    },

    // Test getArchitectureInfo and testOnnxIntegration
    testArchInfo: () => {
      const op = 'archInfo'
      _lastAsyncResult = { op, status: 'pending' }
      void (async () => {
        try {
          const [arch, onnx] = await Promise.all([
            SherpaOnnx.getArchitectureInfo(),
            SherpaOnnx.testOnnxIntegration(),
          ])
          _lastAsyncResult = { op, status: 'success', result: { arch, onnx } }
        } catch (e) {
          _lastAsyncResult = { op, status: 'error', error: String(e) }
        }
      })()
      return { op, status: 'pending' }
    },

    // Full end-to-end streaming ASR: init model → recognize file → release → timing
    recognizeFile: (wavPath: string) => {
      const op = 'recognizeFile'
      _lastAsyncResult = { op, status: 'pending' }
      void (async () => {
        try {
          const result = await ASR.recognizeFromFile(wavPath)
          _lastAsyncResult = { op, status: 'success', result }
        } catch (e) {
          _lastAsyncResult = { op, status: 'error', error: String(e) }
        }
      })()
      return { op, status: 'pending' }
    },

    // One-shot ASR test: init + recognize + release
    // testASR('whisper', wavPath?) — use whisper-small-multilingual
    // testASR('streaming', wavPath?) — use streaming-zipformer-en-20m-mobile
    // testASR('offline', wavPath?) — alias for whisper
    testASR: (modelAlias?: string, wavPath?: string) => {
      const op = 'asrTest'
      _lastAsyncResult = { op, status: 'pending' }
      void (async () => {
        const timing: Record<string, number> = {}
        try {
          const alias = (modelAlias ?? 'whisper').toLowerCase()
          const isStreaming = alias === 'streaming' || alias === 'zipformer'
          let config: Parameters<typeof ASR.initialize>[0]
          let defaultWav: string

          if (isStreaming) {
            const dir = `${MODELS_BASE}/streaming-zipformer-en-20m-mobile/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17-mobile`
            defaultWav = dir + '/test_wavs/1.wav'
            config = {
              modelDir: dir,
              modelType: 'transducer',
              numThreads: 4,
              decodingMethod: 'greedy_search',
              maxActivePaths: 4,
              streaming: true,
              debug: false,
              provider: 'cpu',
              modelFiles: {
                encoder: 'encoder-epoch-99-avg-1.int8.onnx',
                decoder: 'decoder-epoch-99-avg-1.onnx',
                joiner: 'joiner-epoch-99-avg-1.int8.onnx',
                tokens: 'tokens.txt',
              },
            }
          } else {
            // whisper / offline
            const dir = `${MODELS_BASE}/whisper-small-multilingual/sherpa-onnx-whisper-small`
            defaultWav = dir + '/test_wavs/0.wav'
            config = {
              modelDir: dir,
              modelType: 'whisper',
              numThreads: 1,
              decodingMethod: 'greedy_search',
              streaming: false,
              debug: false,
              provider: 'cpu',
              modelFiles: {
                encoder: 'small-encoder.onnx',
                decoder: 'small-decoder.onnx',
                tokens: 'small-tokens.txt',
              },
            }
          }

          const wav = wavPath ?? defaultWav

          const t0 = Date.now()
          const initResult = await ASR.initialize(config)
          timing.initMs = Date.now() - t0
          if (!initResult.success) throw new Error('init failed: ' + initResult.error)

          const t1 = Date.now()
          const asrResult = await ASR.recognizeFromFile(wav)
          timing.inferenceMs = Date.now() - t1

          const t2 = Date.now()
          await ASR.release()
          timing.releaseMs = Date.now() - t2

          _lastAsyncResult = {
            op,
            status: 'success',
            result: { model: alias, transcript: asrResult.text, wavPath: wav, timing },
          }
        } catch (e) {
          _lastAsyncResult = { op, status: 'error', error: String(e), result: { timing } }
        }
      })()
      return { op, status: 'pending' }
    },

    // Internal helper: store result under a named key (used by ad-hoc evals)
    _storeResult: (key: string, value: unknown) => {
      _lastAsyncResult = { op: key, status: 'success', result: value }
    },

    // E2E Audio Tagging via JS service layer: init → processAndCompute → release
    // Uses AudioTaggingService (same path as the UI) rather than raw SherpaOnnx calls.
    testAudioTaggingE2E: (wavPath?: string, modelDir?: string) => {
      const op = 'audioTaggingE2E'
      const BASE = MODELS_BASE
      const defaultModelDir = `${BASE}/ced-tiny-audio-tagging/sherpa-onnx-ced-tiny-audio-tagging-2024-04-19`
      const defaultWav = defaultModelDir + '/test_wavs/1.wav'
      const dir = modelDir ?? defaultModelDir
      const wav = wavPath ?? defaultWav
      _lastAsyncResult = { op, status: 'pending' }
      void (async () => {
        const timing: Record<string, number> = {}
        try {
          const t0 = Date.now()
          const initResult = await AudioTagging.initialize({
            modelDir: dir,
            modelType: 'ced',
            modelFile: 'model.int8.onnx',
            labelsFile: 'class_labels_indices.csv',
            topK: 5,
            numThreads: 2,
            debug: false,
            provider: 'cpu',
          })
          timing.initMs = Date.now() - t0
          if (!initResult.success) throw new Error('initialize failed: ' + initResult.error)

          const t1 = Date.now()
          const tagResult = await AudioTagging.processAndCompute({ filePath: wav, topK: 5 })
          timing.inferenceMs = Date.now() - t1

          const t2 = Date.now()
          await AudioTagging.release()
          timing.releaseMs = Date.now() - t2

          _lastAsyncResult = {
            op,
            status: 'success',
            result: { tagResult, timing, wavPath: wav, modelDir: dir },
          }
        } catch (e) {
          _lastAsyncResult = { op, status: 'error', error: String(e), result: { timing } }
        }
      })()
      return { op, status: 'pending' }
    },

    testStreamingPrimitives: (modelDir?: string, wavPath?: string) => {
      const op = 'streamingPrimitives'
      const defaultModelDir =
        `${MODELS_BASE}/streaming-zipformer-en-20m-mobile/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17-mobile`
      const defaultWav = defaultModelDir + '/test_wavs/1.wav'
      const dir = modelDir ?? defaultModelDir
      const wav = wavPath ?? defaultWav
      _lastAsyncResult = { op, status: 'pending' }
      void (async () => {
        const steps: Record<string, unknown> = {}
        try {
          // 1. Init streaming ASR
          const t0 = Date.now()
          const initResult = await ASR.initialize({
            modelDir: dir,
            modelType: 'transducer',
            numThreads: 4,
            decodingMethod: 'greedy_search',
            maxActivePaths: 4,
            streaming: true,
            debug: false,
            provider: 'cpu',
            modelFiles: {
              encoder: 'encoder-epoch-99-avg-1.int8.onnx',
              decoder: 'decoder-epoch-99-avg-1.onnx',
              joiner: 'joiner-epoch-99-avg-1.int8.onnx',
              tokens: 'tokens.txt',
            },
          })
          steps.initMs = Date.now() - t0
          if (!initResult.success) throw new Error('initAsr failed: ' + initResult.error)
          steps.init = 'PASS'

          // 2. Create online stream
          const streamResult = await ASR.createOnlineStream()
          steps.createStream = streamResult.success ? 'PASS' : 'FAIL'

          // 3. Get empty result (stream just created, no audio fed)
          const emptyResult = await ASR.getResult()
          steps.emptyResult = { text: emptyResult.text, pass: emptyResult.text === '' }

          // 4. Check endpoint (should be false, no audio)
          const epResult = await ASR.isEndpoint()
          steps.isEndpointEmpty = { isEndpoint: epResult.isEndpoint, pass: !epResult.isEndpoint }

          // 5. Feed audio from wav file using recognizeFromFile (which uses streaming internally)
          // But first, test acceptWaveform with a small silent chunk
          const silentChunk = new Array(1600).fill(0) // 100ms of silence at 16kHz
          const waveformResult = await ASR.acceptWaveform(16000, silentChunk)
          steps.acceptWaveform = waveformResult.success ? 'PASS' : 'FAIL'

          // 6. Get result after silence (should still be empty)
          const afterSilence = await ASR.getResult()
          steps.afterSilenceResult = { text: afterSilence.text, pass: afterSilence.text === '' }

          // 7. Reset stream
          const resetResult = await ASR.resetStream()
          steps.resetStream = resetResult.success ? 'PASS' : 'FAIL'

          // 8. Now test with real audio: use recognizeFromFile (existing API, regression check)
          // First release and re-init to test full flow
          await ASR.release()
          await ASR.initialize({
            modelDir: dir,
            modelType: 'transducer',
            numThreads: 4,
            decodingMethod: 'greedy_search',
            maxActivePaths: 4,
            streaming: true,
            debug: false,
            provider: 'cpu',
            modelFiles: {
              encoder: 'encoder-epoch-99-avg-1.int8.onnx',
              decoder: 'decoder-epoch-99-avg-1.onnx',
              joiner: 'joiner-epoch-99-avg-1.int8.onnx',
              tokens: 'tokens.txt',
            },
          })
          const fileResult = await ASR.recognizeFromFile(wav)
          steps.recognizeFromFile = {
            text: fileResult.text,
            success: fileResult.success,
            pass: fileResult.success && (fileResult.text?.length ?? 0) > 0,
          }

          await ASR.release()
          steps.release = 'PASS'

          const allPassed =
            steps.createStream === 'PASS' &&
            steps.acceptWaveform === 'PASS' &&
            steps.resetStream === 'PASS' &&
            (steps.emptyResult as Record<string, unknown>).pass === true &&
            (steps.afterSilenceResult as Record<string, unknown>).pass === true &&
            (steps.recognizeFromFile as Record<string, unknown>).pass === true

          _lastAsyncResult = {
            op,
            status: 'success',
            result: { steps, allPassed },
          }
        } catch (e) {
          _lastAsyncResult = { op, status: 'error', error: String(e), result: { steps } }
        }
      })()
      return { op, status: 'pending' }
    },

    testASRFull: (modelDir?: string, wavPath?: string) => {
      const op = 'asrFull'
      const defaultModelDir =
        `${MODELS_BASE}/streaming-zipformer-en-20m-mobile/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17-mobile`
      const defaultWav = defaultModelDir + '/test_wavs/0.wav'
      const dir = modelDir ?? defaultModelDir
      const wav = wavPath ?? defaultWav
      _lastAsyncResult = { op, status: 'pending' }
      void (async () => {
        const timing: Record<string, number> = {}
        try {
          // Step 1: init ASR
          const t0 = Date.now()
          const initResult = await ASR.initialize({
            modelDir: dir,
            modelType: 'transducer',
            numThreads: 4,
            decodingMethod: 'greedy_search',
            maxActivePaths: 4,
            streaming: true,
            debug: false,
            provider: 'cpu',
            modelFiles: {
              encoder: 'encoder-epoch-99-avg-1.int8.onnx',
              decoder: 'decoder-epoch-99-avg-1.onnx',
              joiner: 'joiner-epoch-99-avg-1.int8.onnx',
              tokens: 'tokens.txt',
            },
          })
          timing.initMs = Date.now() - t0
          if (!initResult.success) {
            throw new Error('initAsr failed: ' + initResult.error)
          }

          // Step 2: recognize
          const t1 = Date.now()
          const asrResult = await ASR.recognizeFromFile(wav)
          timing.inferenceMs = Date.now() - t1

          // Step 3: release
          const t2 = Date.now()
          await ASR.release()
          timing.releaseMs = Date.now() - t2

          _lastAsyncResult = {
            op,
            status: 'success',
            result: {
              transcript: asrResult,
              expectedTranscript:
                'AFTER EARLY NIGHTFALL THE YELLOW LAMPS WOULD LIGHT UP HERE AND THERE THE SQUALID QUARTER OF THE BROTHELS',
              timing,
              wavPath: wav,
              modelDir: dir,
            },
          }
        } catch (e) {
          _lastAsyncResult = { op, status: 'error', error: String(e), result: { timing } }
        }
      })()
      return { op, status: 'pending' }
    },
  }
}
