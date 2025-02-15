// packages/expo-audio-stream/src/events.ts

import { LegacyEventEmitter, type EventSubscription } from 'expo-modules-core'

import { AudioAnalysis } from './AudioAnalysis/AudioAnalysis.types'
import { RecordingInterruptionEvent } from './ExpoAudioStream.types'
import ExpoAudioStreamModule from './ExpoAudioStreamModule'

const emitter = new LegacyEventEmitter(ExpoAudioStreamModule)

// Internal event payload from native module
export interface AudioEventPayload {
    encoded?: string
    buffer?: Float32Array
    fileUri: string
    lastEmittedSize: number
    position: number
    deltaSize: number
    totalSize: number
    mimeType: string
    streamUuid: string
    compression?: {
        data?: string | Blob // Base64 (native) or Float32Array (web) encoded compressed data chunk
        position: number
        eventDataSize: number
        totalSize: number
    }
}

export function addAudioEventListener(
    listener: (event: AudioEventPayload) => Promise<void>
): EventSubscription {
    return emitter.addListener<AudioEventPayload>('AudioData', listener)
}

// Only aliasing the AudioAnalysis type for the event payload
export interface AudioAnalysisEvent extends AudioAnalysis {}

export function addAudioAnalysisListener(
    listener: (event: AudioAnalysisEvent) => Promise<void>
): EventSubscription {
    return emitter.addListener<AudioAnalysisEvent>('AudioAnalysis', listener)
}

export function addRecordingInterruptionListener(
    listener: (event: RecordingInterruptionEvent) => void
): EventSubscription {
    // Add debug logging
    console.debug('Adding recording interruption listener')

    const subscription = emitter.addListener<RecordingInterruptionEvent>(
        'onRecordingInterrupted', // Make sure this matches the native event name
        (event) => {
            console.debug('Recording interruption event received:', event)
            listener(event)
        }
    )

    return subscription
}
