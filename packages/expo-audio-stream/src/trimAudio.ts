import { LegacyEventEmitter, type EventSubscription } from 'expo-modules-core'
import { Platform } from 'react-native'

import {
    TrimAudioOptions,
    TrimAudioResult,
    TrimProgressEvent,
} from './ExpoAudioStream.types'
import ExpoAudioStreamModule from './ExpoAudioStreamModule'

// Create a single emitter instance
const emitter = new LegacyEventEmitter(ExpoAudioStreamModule)

export async function trimAudio(
    options: TrimAudioOptions,
    progressCallback?: (event: TrimProgressEvent) => void
): Promise<TrimAudioResult> {
    if (Platform.OS === 'web') {
        throw new Error('trimAudio is not supported on web yet')
    }

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
        const result = await ExpoAudioStreamModule.trimAudio(options)
        return result
    } finally {
        if (subscription) {
            subscription.remove()
        }
    }
}

// Simplified version returning only the URI
export async function trimAudioSimple(
    options: TrimAudioOptions
): Promise<string> {
    const result = await trimAudio(options)
    return result.uri
}
