import { BitDepth, DataPoint, ExpoAudioStreamModule, ExtractedAudioData } from '@siteed/expo-audio-stream'
import { useCallback, useEffect, useState } from 'react'
import { baseLogger } from '../config'

const logger = baseLogger.extend("useAudioSegmentData")

interface UseAudioSegmentDataProps {
    fileUri: string
    selectedDataPoint?: DataPoint
    bitDepth?: BitDepth
    includeNormalizedData?: boolean
}

export function useAudioSegmentData({ 
    fileUri, 
    selectedDataPoint,
    bitDepth = 16,
    includeNormalizedData = false
}: UseAudioSegmentDataProps) {
    const [audioData, setAudioData] = useState<ExtractedAudioData>()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error>()

    const loadData = useCallback(async () => {
        if (!selectedDataPoint) {
            logger.warn('No data point selected')
            return
        }

        logger.info('Loading audio segment data:', {
            fileUri,
            selectedDataPoint: {
                startPosition: selectedDataPoint.startPosition,
                endPosition: selectedDataPoint.endPosition,
                startTime: selectedDataPoint.startTime,
                endTime: selectedDataPoint.endTime,
                samples: selectedDataPoint.samples
            },
            bitDepth,
            includeNormalizedData
        })

        try {
            setIsLoading(true)
            setError(undefined)

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

            logger.info('Calling extractAudioData with options:', {
                fileUri,
                extractionOptions,
                bitDepth,
                includeNormalizedData
            })

            const result = await ExpoAudioStreamModule.extractAudioData({
                fileUri,
                ...extractionOptions,
                includeNormalizedData,
                logger: baseLogger.extend('extractAudioData'),
                decodingOptions: {
                    targetBitDepth: bitDepth,
                    normalizeAudio: includeNormalizedData
                }
            })

            if (!result?.pcmData) {
                logger.error('No PCM data returned from extractAudioData')
                setError(new Error('No data returned from audio extraction'))
                return
            }

            // Log the result for debugging
            logger.info('Audio data extracted:', {
                pcmDataLength: result.pcmData.length,
                samples: result.samples,
                durationMs: result.durationMs,
                sampleRate: result.sampleRate,
                channels: result.channels
            })

            setAudioData(result)
        } catch (err) {
            logger.error('Failed to load audio segment data:', {
                error: err,
                fileUri,
                selectedDataPoint
            })
            setError(err instanceof Error ? err : new Error('Unknown error'))
        } finally {
            setIsLoading(false)
        }
    }, [fileUri, selectedDataPoint, bitDepth, includeNormalizedData])

    useEffect(() => {
        loadData()
    }, [loadData])

    return {
        audioData,
        isLoading,
        error,
        reload: loadData
    }
} 