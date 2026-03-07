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
import SherpaOnnx, { ASR, SpeakerId } from '@siteed/sherpa-onnx.rn'

// State holders updated by AgenticBridgeSync component
let _routeInfo: { pathname: string; segments: string[] } = {
  pathname: '',
  segments: [],
}
let _modelState: Record<string, unknown> = {}

export function setAgenticRouteInfo(pathname: string, segments: string[]) {
  _routeInfo = { pathname, segments }
}

export function setAgenticModelState(state: Record<string, unknown>) {
  _modelState = state
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
      const BASE = '/data/data/com.deeeed.sherpaonnxdemo/files/models'
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

    // Full end-to-end Audio Tagging: init model → process file → release → timing
    testAudioTaggingFull: (wavPath?: string, modelDir?: string) => {
      const op = 'audioTaggingFull'
      const BASE = '/data/data/com.deeeed.sherpaonnxdemo/files/models'
      const defaultModelDir = `${BASE}/ced-mini-audio-tagging/sherpa-onnx-ced-mini-audio-tagging-2024-04-19`
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
      const BASE = '/data/data/com.deeeed.sherpaonnxdemo/files/models'
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
        '/data/data/com.deeeed.sherpaonnxdemo/files/models/streaming-zipformer-en-20m-mobile/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17-mobile'
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
    testASRFull: (modelDir?: string, wavPath?: string) => {
      const op = 'asrFull'
      const defaultModelDir =
        '/data/data/com.deeeed.sherpaonnxdemo/files/models/streaming-zipformer-en-20m-mobile/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17-mobile'
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
