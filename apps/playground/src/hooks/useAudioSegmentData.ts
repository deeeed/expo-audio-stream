import { DataPoint, ExpoAudioStreamModule } from '@siteed/expo-audio-stream'
import { useCallback, useEffect, useState } from 'react'
import { baseLogger } from '../config'

const logger = baseLogger.extend("useAudioSegmentData")

interface UseAudioSegmentDataProps {
    fileUri: string
    selectedDataPoint?: DataPoint
    bitDepth?: number
}

export function useAudioSegmentData({ 
    fileUri, 
    selectedDataPoint,
    bitDepth = 16
}: UseAudioSegmentDataProps) {
    const [byteArray, setByteArray] = useState<Uint8Array>()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error>()

    const loadData = useCallback(async () => {
        if (!selectedDataPoint) return

        try {
            setIsLoading(true)
            setError(undefined)

            // Determine whether to use position-based or time-based extraction
            const extractionOptions = selectedDataPoint.startPosition !== undefined
                ? {
                    position: selectedDataPoint.startPosition,
                    length: selectedDataPoint.endPosition 
                        ? selectedDataPoint.endPosition - selectedDataPoint.startPosition
                        : undefined
                }
                : {
                    startTimeMs: selectedDataPoint.startTime,
                    endTimeMs: selectedDataPoint.endTime
                }

            const result = await ExpoAudioStreamModule.extractAudioData({
                fileUri,
                ...extractionOptions,
                logger: baseLogger.extend('extractAudioData'),
                decodingOptions: {
                    targetBitDepth: bitDepth
                }
            })

            setByteArray(result.data)
        } catch (err) {
            logger.error('Failed to load audio segment data:', err)
            setError(err instanceof Error ? err : new Error('Unknown error'))
        } finally {
            setIsLoading(false)
        }
    }, [fileUri, selectedDataPoint, bitDepth])

    useEffect(() => {
        loadData()
    }, [loadData])

    return {
        byteArray,
        isLoading,
        error,
        reload: loadData
    }
} 