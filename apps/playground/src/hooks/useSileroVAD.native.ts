// apps/playground/src/hooks/useSileroVAD.native.ts
import { Asset } from 'expo-asset'
import { useCallback, useRef, useState } from 'react'

import { VAD } from '@siteed/sherpa-onnx.rn'

import { baseLogger } from '../config'
import type { UseSileroVADProps, VADResult } from './useSileroVAD'

const logger = baseLogger.extend('useSileroVAD')

export function useSileroVAD({ onError }: UseSileroVADProps) {
    const [isModelLoading, setIsModelLoading] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const initializedRef = useRef(false)
    const initializingRef = useRef(false)

    const initVAD = useCallback(async () => {
        if (initializedRef.current || initializingRef.current) return
        initializingRef.current = true
        setIsModelLoading(true)
        try {
            const [asset] = await Asset.loadAsync(require('@assets/silero_vad_v5.onnx'))
            const localUri = asset.localUri!
            const path = localUri.startsWith('file://') ? localUri.substring(7) : localUri
            const lastSlash = path.lastIndexOf('/')
            const modelDir = path.substring(0, lastSlash)
            const modelFile = path.substring(lastSlash + 1)
            logger.info('VAD model path', { modelDir, modelFile })
            const result = await VAD.init({ modelDir, modelFile })
            if (!result.success) throw new Error(result.error || 'VAD init failed')
            initializedRef.current = true
            logger.info('VAD initialized via sherpa-onnx.rn')
        } catch (error) {
            logger.error('VAD init error', error)
            onError?.(error instanceof Error ? error : new Error('VAD init failed'))
        } finally {
            setIsModelLoading(false)
            initializingRef.current = false
        }
    }, [onError])

    const isProcessingRef = useRef(false)

    const processAudioSegment = useCallback(async (
        audioData: Float32Array,
        sampleRate: number,
        timestamp: number = Date.now()
    ): Promise<VADResult | null> => {
        if (isProcessingRef.current) return null
        if (!initializedRef.current) {
            await initVAD()
            if (!initializedRef.current) return null
        }
        try {
            isProcessingRef.current = true
            setIsProcessing(true)
            const result = await VAD.acceptWaveform(sampleRate, Array.from(audioData))
            if (!result.success) return null
            return {
                probability: result.isSpeechDetected ? 0.9 : 0.1,
                isSpeech: result.isSpeechDetected,
                timestamp,
            }
        } catch (error) {
            logger.error('VAD processing error', error)
            onError?.(error instanceof Error ? error : new Error('VAD processing failed'))
            return null
        } finally {
            isProcessingRef.current = false
            setIsProcessing(false)
        }
    }, [initVAD, onError])

    return {
        isModelLoading,
        isProcessing,
        processAudioSegment,
        speechTimestamps: [],
        currentSegment: null,
        reset: async () => { await VAD.reset() },
        initModel: initVAD,
    }
}
