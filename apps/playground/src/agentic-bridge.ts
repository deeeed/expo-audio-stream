/**
 * Agentic CDP Bridge — app-side runtime for CDP-based automation.
 *
 * Installs `globalThis.__AGENTIC__` with navigate, getRoute, getState,
 * and recording control (startRecording, stopRecording, etc.).
 * Only active in __DEV__ mode. Import this file from _layout.tsx for side effects.
 *
 * Audio/route state is kept in sync by the AgenticBridgeSync component.
 */

import { Platform } from 'react-native'
import { router } from 'expo-router'
import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system/legacy'

import type { UseAudioRecorderState } from '@siteed/audio-studio'
import {
    extractPreview,
    extractAudioData,
    extractMelSpectrogram,
    trimAudio,
    AudioDeviceManager,
} from '@siteed/audio-studio'

// State holders updated by AgenticBridgeSync component
let _audioState: Record<string, unknown> = {}
let _routeInfo: { pathname: string; segments: string[] } = {
    pathname: '',
    segments: [],
}

// Recorder instance wired by AgenticBridgeSync
let _recorder: UseAudioRecorderState | null = null

export function setAgenticAudioState(state: Record<string, unknown>) {
    _audioState = state
}

export function setAgenticRouteInfo(pathname: string, segments: string[]) {
    _routeInfo = { pathname, segments }
}

export function setAgenticRecorder(recorder: UseAudioRecorderState) {
    _recorder = recorder
}

/**
 * Strip non-serializable (function) properties from a config object.
 * CDP page.evaluate() cannot transport functions across the protocol.
 */
function stripFunctions(obj: Record<string, unknown>): Record<string, unknown> {
    const clean: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value !== 'function') {
            clean[key] = value
        }
    }
    return clean
}

// --- Async result store for fire-and-store pattern (CDP awaitPromise:false) ---
let _lastAsyncResult: { op: string; status: 'pending' | 'success' | 'error'; result?: unknown; error?: string } | null = null

/**
 * Load jfk.mp3 sample audio to a local file URI (standalone, not a hook).
 */
async function loadSampleFileUri(): Promise<string> {
    const asset = Asset.fromModule(require('@assets/jfk.mp3'))
    await asset.downloadAsync()
    if (!asset.localUri) throw new Error('Failed to load sample audio asset')
    const dest = `${FileSystem.cacheDirectory}jfk_test.mp3`
    await FileSystem.copyAsync({ from: asset.localUri, to: dest })
    return dest
}

if (__DEV__) {
    (globalThis as Record<string, unknown>).__AGENTIC__ = {
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
            return _audioState
        },

        canGoBack: () => {
            return router.canGoBack()
        },

        goBack: () => {
            router.back()
            return true
        },

        // --- Recording control ---

        startRecording: async (config: Record<string, unknown> = {}) => {
            if (!_recorder) {
                return { error: 'Recorder not available (AgenticBridgeSync not mounted)' }
            }
            try {
                const safeConfig = stripFunctions(config)
                const result = await _recorder.startRecording(safeConfig as never)
                return result
            } catch (e) {
                return { error: String(e) }
            }
        },

        stopRecording: async () => {
            if (!_recorder) {
                return { error: 'Recorder not available (AgenticBridgeSync not mounted)' }
            }
            try {
                const result = await _recorder.stopRecording()
                return result
            } catch (e) {
                return { error: String(e) }
            }
        },

        pauseRecording: async () => {
            if (!_recorder) {
                return { error: 'Recorder not available (AgenticBridgeSync not mounted)' }
            }
            try {
                await _recorder.pauseRecording()
                return true
            } catch (e) {
                return { error: String(e) }
            }
        },

        resumeRecording: async () => {
            if (!_recorder) {
                return { error: 'Recorder not available (AgenticBridgeSync not mounted)' }
            }
            try {
                await _recorder.resumeRecording()
                return true
            } catch (e) {
                return { error: String(e) }
            }
        },

        prepareRecording: async (config: Record<string, unknown> = {}) => {
            if (!_recorder) {
                return { error: 'Recorder not available (AgenticBridgeSync not mounted)' }
            }
            try {
                const safeConfig = stripFunctions(config)
                await _recorder.prepareRecording(safeConfig as never)
                return { prepared: true }
            } catch (e) {
                return { error: String(e) }
            }
        },

        // --- Native module validation tests (fire-and-store pattern) ---

        getLastResult: () => {
            return _lastAsyncResult
        },

        testExtractPreview: () => {
            const op = 'extractPreview'
            _lastAsyncResult = { op, status: 'pending' }
            void (async () => {
                try {
                    const fileUri = await loadSampleFileUri()
                    const result = await extractPreview({ fileUri, numberOfPoints: 50, startTimeMs: 0, endTimeMs: 10000 })
                    _lastAsyncResult = { op, status: 'success', result: { dataPointCount: result.dataPoints.length, durationMs: result.durationMs } }
                } catch (e) {
                    _lastAsyncResult = { op, status: 'error', error: String(e) }
                }
            })()
            return { op, status: 'pending' }
        },

        testExtractAudioData: () => {
            const op = 'extractAudioData'
            _lastAsyncResult = { op, status: 'pending' }
            void (async () => {
                try {
                    const fileUri = await loadSampleFileUri()
                    const result = await extractAudioData({ fileUri, startTimeMs: 0, endTimeMs: 5000 })
                    _lastAsyncResult = { op, status: 'success', result: { sampleRate: result.sampleRate, channels: result.channels, durationMs: result.durationMs, samples: result.samples } }
                } catch (e) {
                    _lastAsyncResult = { op, status: 'error', error: String(e) }
                }
            })()
            return { op, status: 'pending' }
        },

        testTrimAudio: () => {
            const op = 'trimAudio'
            _lastAsyncResult = { op, status: 'pending' }
            void (async () => {
                try {
                    const fileUri = await loadSampleFileUri()
                    const result = await trimAudio({ fileUri, startTimeMs: 0, endTimeMs: 5000 })
                    _lastAsyncResult = { op, status: 'success', result: { uri: result.uri, durationMs: result.durationMs, size: result.size } }
                } catch (e) {
                    _lastAsyncResult = { op, status: 'error', error: String(e) }
                }
            })()
            return { op, status: 'pending' }
        },

        testExtractMelSpectrogram: () => {
            const op = 'extractMelSpectrogram'
            _lastAsyncResult = { op, status: 'pending' }
            void (async () => {
                try {
                    const fileUri = await loadSampleFileUri()
                    const result = await extractMelSpectrogram({ fileUri, windowSizeMs: 25, hopLengthMs: 10, nMels: 40, startTimeMs: 0, endTimeMs: 5000 })
                    _lastAsyncResult = { op, status: 'success', result: { timeSteps: result.timeSteps, nMels: result.nMels, durationMs: result.durationMs } }
                } catch (e) {
                    _lastAsyncResult = { op, status: 'error', error: String(e) }
                }
            })()
            return { op, status: 'pending' }
        },

        getDevices: () => {
            const op = 'getDevices'
            _lastAsyncResult = { op, status: 'pending' }
            void (async () => {
                try {
                    const mgr = new AudioDeviceManager()
                    const devices = await mgr.getAvailableDevices()
                    _lastAsyncResult = { op, status: 'success', result: devices }
                } catch (e) {
                    _lastAsyncResult = { op, status: 'error', error: String(e) }
                }
            })()
            return { op, status: 'pending' }
        },

        testSelectInputDevice: (deviceId: string) => {
            const op = 'selectInputDevice'
            _lastAsyncResult = { op, status: 'pending' }
            void (async () => {
                try {
                    const mgr = new AudioDeviceManager()
                    const success = await mgr.selectDevice(deviceId)
                    await new Promise(resolve => setTimeout(resolve, 500))
                    const state = _audioState
                    _lastAsyncResult = { op, status: 'success', result: { success, isRecording: state.isRecording, deviceId } }
                } catch (e) {
                    _lastAsyncResult = { op, status: 'error', error: String(e) }
                }
            })()
            return { op, status: 'pending' }
        },

        testResetToDefaultDevice: () => {
            const op = 'resetToDefaultDevice'
            _lastAsyncResult = { op, status: 'pending' }
            void (async () => {
                try {
                    const mgr = new AudioDeviceManager()
                    const success = await mgr.resetToDefaultDevice()
                    await new Promise(resolve => setTimeout(resolve, 500))
                    const state = _audioState
                    _lastAsyncResult = { op, status: 'success', result: { success, isRecording: state.isRecording } }
                } catch (e) {
                    _lastAsyncResult = { op, status: 'error', error: String(e) }
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

                // hook.getFiberRoots(rendererId) is the correct API in React 18+
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

        scrollView: (options: { testId?: string; offset?: number; animated?: boolean } = {}) => {
            const { testId, offset = 300, animated = false } = options
            try {
                const hook = (globalThis as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ as Record<string, unknown> | undefined
                if (!hook) return { ok: false, error: '__REACT_DEVTOOLS_GLOBAL_HOOK__ not found' }

                const renderers = hook.renderers as Map<number, unknown> | undefined
                if (!renderers) return { ok: false, error: 'No renderers found' }

                const getFiberRoots = hook.getFiberRoots as ((id: number) => Set<Record<string, unknown>>) | undefined

                const tryScroll = (fiber: Record<string, unknown> | null): boolean => {
                    if (!fiber) return false
                    const stateNode = fiber.stateNode as Record<string, unknown> | null
                    if (stateNode) {
                        if (typeof stateNode.scrollTo === 'function') {
                            const node = stateNode as { scrollTo: (opts: { y: number; animated: boolean }) => void }
                            node.scrollTo({ y: offset, animated })
                            return true
                        }
                        if (typeof stateNode.scrollToOffset === 'function') {
                            const node = stateNode as { scrollToOffset: (opts: { offset: number; animated: boolean }) => void }
                            node.scrollToOffset({ offset, animated })
                            return true
                        }
                    }
                    if (tryScroll(fiber.child as Record<string, unknown> | null)) return true
                    if (tryScroll(fiber.sibling as Record<string, unknown> | null)) return true
                    return false
                }

                const walkForTestId = (fiber: Record<string, unknown> | null): Record<string, unknown> | null => {
                    if (!fiber) return null
                    const props = fiber.memoizedProps as Record<string, unknown> | null
                    if (props?.testID === testId) return fiber
                    const found = walkForTestId(fiber.child as Record<string, unknown> | null)
                    if (found) return found
                    return walkForTestId(fiber.sibling as Record<string, unknown> | null)
                }

                for (let id = 1; id <= 3; id++) {
                    if (!renderers.get(id)) continue
                    const fiberRoots = getFiberRoots ? getFiberRoots(id) : undefined
                    if (!fiberRoots) continue

                    let scrolled = false
                    fiberRoots.forEach((root) => {
                        if (scrolled) return
                        const rootFiber = root.current as Record<string, unknown> | null
                        if (testId) {
                            const anchor = walkForTestId(rootFiber)
                            if (anchor) {
                                scrolled =
                                    tryScroll(anchor) ||
                                    tryScroll(anchor.child as Record<string, unknown> | null) ||
                                    tryScroll(anchor.sibling as Record<string, unknown> | null)
                            }
                        } else {
                            scrolled = tryScroll(rootFiber)
                        }
                    })
                    if (scrolled) return { ok: true, testId, offset, animated }
                }
                return { ok: false, error: testId ? `No scrollable found near testID="${testId}"` : 'No scrollable found in fiber tree' }
            } catch (e) {
                return { ok: false, error: String(e) }
            }
        },
    }
}
