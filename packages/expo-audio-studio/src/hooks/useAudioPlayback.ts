// packages/expo-audio-studio/src/hooks/useAudioPlayback.ts
import { useRef, useCallback, useState } from 'react'
import { Platform } from 'react-native'

import ExpoAudioStreamModule from '../ExpoAudioStreamModule'
import { PlaybackConfig, UseAudioPlaybackReturn } from '../ExpoAudioStream.types'

const DEFAULT_SAMPLE_RATE = 24000 // Gemini outputs 24kHz audio
const DEFAULT_GAIN = 1.8 // Boost volume (Gemini audio is often quieter)

// Estimated duration of audio chunk based on sample rate
const CHUNK_DURATION_MS = 100

// Extra buffer after audio finishes before marking as not playing
const POST_PLAYBACK_BUFFER_MS = 500

/**
 * Hook for playing streaming PCM audio through expo-audio-studio.
 *
 * This hook uses the same AVAudioEngine as the audio recorder, which allows
 * hardware echo cancellation (VoiceProcessingIO) to work correctly on iOS.
 * Using separate audio engines for recording and playback causes VoiceProcessingIO
 * conflicts that result in "render err: -1" errors.
 *
 * @platform iOS (uses native AVAudioEngine playback)
 *
 * @example
 * ```typescript
 * const { initialize, playChunk, clearQueue, cleanup, isPlaying } = useAudioPlayback();
 *
 * // When entering voice mode
 * useEffect(() => {
 *   initialize({ sampleRate: 24000, gain: 1.8 });
 *   return () => cleanup();
 * }, []);
 *
 * // When receiving audio from Gemini
 * const handleAudioChunk = (base64Audio: string) => {
 *   playChunk(base64Audio);
 * };
 *
 * // When user interrupts
 * const handleInterrupt = () => {
 *   clearQueue();
 * };
 * ```
 */
export function useAudioPlayback(): UseAudioPlaybackReturn {
    const [isPlaying, setIsPlaying] = useState(false)
    const isInitializedRef = useRef(false)
    const sampleRateRef = useRef(DEFAULT_SAMPLE_RATE)
    const playbackStateCallbackRef = useRef<
        ((isPlaying: boolean) => void) | null
    >(null)
    const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null
    )
    const lastChunkTimeRef = useRef<number>(0)
    const queueSizeRef = useRef(0)

    /**
     * Register callback for playback state changes.
     */
    const onPlaybackStateChange = useCallback(
        (callback: (isPlaying: boolean) => void) => {
            playbackStateCallbackRef.current = callback
        },
        []
    )

    /**
     * Update playing state and notify callback.
     */
    const setPlayingState = useCallback((playing: boolean) => {
        setIsPlaying((prev) => {
            if (prev !== playing) {
                playbackStateCallbackRef.current?.(playing)
                return playing
            }
            return prev
        })
    }, [])

    /**
     * Schedule check for when playback finishes.
     */
    const schedulePlaybackEndCheck = useCallback(() => {
        if (playbackTimeoutRef.current) {
            clearTimeout(playbackTimeoutRef.current)
        }

        const estimatedDuration =
            queueSizeRef.current * CHUNK_DURATION_MS + POST_PLAYBACK_BUFFER_MS

        playbackTimeoutRef.current = setTimeout(() => {
            const timeSinceLastChunk = Date.now() - lastChunkTimeRef.current
            if (timeSinceLastChunk >= POST_PLAYBACK_BUFFER_MS) {
                setPlayingState(false)
            } else {
                schedulePlaybackEndCheck()
            }
        }, estimatedDuration)
    }, [setPlayingState])

    /**
     * Initialize the playback system.
     * Call this when entering voice mode.
     */
    const initialize = useCallback(
        (config?: PlaybackConfig) => {
            if (isInitializedRef.current) return

            // Only supported on iOS for now
            if (Platform.OS !== 'ios') {
                console.warn(
                    '[useAudioPlayback] Native playback only supported on iOS'
                )
                return
            }

            try {
                const sampleRate = config?.sampleRate ?? DEFAULT_SAMPLE_RATE
                const gain = config?.gain ?? DEFAULT_GAIN

                sampleRateRef.current = sampleRate

                // Initialize the native playback system
                ExpoAudioStreamModule.initializePlayback(sampleRate)

                // Set volume/gain
                ExpoAudioStreamModule.setPlaybackVolume(gain)

                isInitializedRef.current = true
                console.log(
                    '[useAudioPlayback] Initialized at',
                    sampleRate,
                    'Hz with gain:',
                    gain
                )
            } catch (error) {
                console.error('[useAudioPlayback] Failed to initialize:', error)
            }
        },
        []
    )

    /**
     * Play a chunk of base64-encoded PCM16 audio.
     */
    const playChunk = useCallback(
        (base64Audio: string) => {
            if (Platform.OS !== 'ios') {
                console.warn(
                    '[useAudioPlayback] Native playback only supported on iOS'
                )
                return
            }

            if (!isInitializedRef.current) {
                console.warn(
                    '[useAudioPlayback] Not initialized, initializing now...'
                )
                initialize()
            }

            try {
                // Pass base64 audio directly to native - it handles PCM16 to Float32 conversion
                ExpoAudioStreamModule.playBuffer(
                    base64Audio,
                    sampleRateRef.current
                )

                queueSizeRef.current++
                lastChunkTimeRef.current = Date.now()

                setPlayingState(true)
                schedulePlaybackEndCheck()
            } catch (error) {
                console.error('[useAudioPlayback] Failed to play chunk:', error)
            }
        },
        [initialize, setPlayingState, schedulePlaybackEndCheck]
    )

    /**
     * Clear all queued audio.
     * Call this when the user interrupts playback.
     */
    const clearQueue = useCallback(() => {
        if (playbackTimeoutRef.current) {
            clearTimeout(playbackTimeoutRef.current)
        }

        if (Platform.OS !== 'ios') return

        try {
            ExpoAudioStreamModule.clearPlaybackQueue()
            queueSizeRef.current = 0
            console.log('[useAudioPlayback] Queue cleared')

            // Delay marking as not playing to let audio hardware settle
            playbackTimeoutRef.current = setTimeout(() => {
                setPlayingState(false)
            }, POST_PLAYBACK_BUFFER_MS)
        } catch (error) {
            console.error('[useAudioPlayback] Failed to clear queue:', error)
        }
    }, [setPlayingState])

    /**
     * Clean up audio resources.
     * Call this when leaving voice mode.
     */
    const cleanup = useCallback(() => {
        if (playbackTimeoutRef.current) {
            clearTimeout(playbackTimeoutRef.current)
            playbackTimeoutRef.current = null
        }

        if (Platform.OS === 'ios') {
            try {
                ExpoAudioStreamModule.cleanupPlayback()
            } catch (error) {
                console.error('[useAudioPlayback] Failed to cleanup:', error)
            }
        }

        isInitializedRef.current = false
        setPlayingState(false)
        queueSizeRef.current = 0
        playbackStateCallbackRef.current = null
        console.log('[useAudioPlayback] Cleaned up')
    }, [setPlayingState])

    return {
        initialize,
        playChunk,
        clearQueue,
        cleanup,
        isPlaying,
        onPlaybackStateChange,
    }
}
