// packages/expo-audio-stream/src/events.ts

import { LegacyEventEmitter, type EventSubscription } from 'expo-modules-core'

import { AudioAnalysis } from './AudioAnalysis/AudioAnalysis.types'
import ExpoAudioStreamModule from './ExpoAudioStreamModule'
import { getLogger } from './logger'

const emitter = new LegacyEventEmitter(ExpoAudioStreamModule)
const logger = getLogger('events')

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
}

export function addAudioEventListener(
    listener: (event: AudioEventPayload) => Promise<void>
): EventSubscription {
    logger.log('Adding listener for AudioData event')
    return emitter.addListener<AudioEventPayload>('AudioData', listener)
}

// Only aliasing the AudioAnalysis type for the event payload
export interface AudioAnalysisEvent extends AudioAnalysis {}

export function addAudioAnalysisListener(
    listener: (event: AudioAnalysisEvent) => Promise<void>
): EventSubscription {
    logger.log('Adding listener for AudioAnalysis event')
    return emitter.addListener<AudioAnalysisEvent>('AudioAnalysis', listener)
}
