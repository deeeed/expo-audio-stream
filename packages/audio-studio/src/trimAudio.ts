import { LegacyEventEmitter, type EventSubscription } from 'expo-modules-core'

import {
    TrimAudioOptions,
    TrimAudioResult,
    TrimProgressEvent,
} from './AudioStudio.types'
import AudioStudioModule from './AudioStudioModule'
import { cleanNativeOptions } from './utils/cleanNativeOptions'

// Create a single emitter instance
const emitter = new LegacyEventEmitter(AudioStudioModule)

/**
 * Trims an audio file based on the provided options.
 *
 * @experimental This API is experimental and not fully optimized for production use.
 * Performance may vary based on file size and device capabilities.
 * Future versions may include breaking changes.
 *
 * @param options Configuration options for the trimming operation
 * @param progressCallback Optional callback to receive progress updates
 * @returns Promise resolving to the trimmed audio file information, including processing time
 */
export async function trimAudio(
    options: TrimAudioOptions,
    progressCallback?: (event: TrimProgressEvent) => void
): Promise<TrimAudioResult> {
    // Validation
    if (!options.fileUri) {
        throw new Error('fileUri is required')
    }
    const mode = options.mode ?? 'single'
    if (mode === 'single') {
        if (
            options.startTimeMs === undefined &&
            options.endTimeMs === undefined
        ) {
            throw new Error(
                'At least one of startTimeMs or endTimeMs must be provided in single mode'
            )
        }
    } else if (mode === 'keep' || mode === 'remove') {
        if (!options.ranges || options.ranges.length === 0) {
            throw new Error(
                'ranges must be provided and non-empty for keep or remove modes'
            )
        }
    } else {
        throw new Error(
            `Invalid mode: ${mode}. Must be 'single', 'keep', or 'remove'`
        )
    }

    // Set up progress event listener if callback is provided
    let subscription: EventSubscription | undefined
    if (progressCallback) {
        subscription = emitter.addListener(
            'TrimProgress',
            (event: TrimProgressEvent) => {
                progressCallback(event)
            }
        )
    }

    try {
        // Clean non-serializable/undefined values to avoid Android Kotlin bridge crash
        const result = await AudioStudioModule.trimAudio(
            cleanNativeOptions(options)
        )
        return result
    } finally {
        if (subscription) {
            subscription.remove()
        }
    }
}

/**
 * Simplified version of trimAudio that returns only the URI of the trimmed file.
 *
 * @experimental This API is experimental and not fully optimized for production use.
 * Performance may vary based on file size and device capabilities.
 * Future versions may include breaking changes.
 *
 * @param options Configuration options for the trimming operation
 * @returns Promise resolving to the URI of the trimmed audio file
 */
export async function trimAudioSimple(
    options: TrimAudioOptions
): Promise<string> {
    const result = await trimAudio(options)
    return result.uri
}
