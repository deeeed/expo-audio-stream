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
            bitDepth
        })

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

            logger.info('Calling extractAudioData with options:', {
                fileUri,
                extractionOptions,
                bitDepth
            })

            const result = await ExpoAudioStreamModule.extractAudioData({
                fileUri,
                ...extractionOptions,
                logger: baseLogger.extend('extractAudioData'),
                decodingOptions: {
                    targetBitDepth: bitDepth
                }
            })

            logger.info('Raw extraction result:', {
                hasResult: !!result,
                resultKeys: result ? Object.keys(result) : [],
                dataLength: result?.data?.length,
                dataType: result?.data ? result.data.constructor.name : 'no data',
                hasData: !!result?.data
            })

            if (!result?.data) {
                logger.error('No data returned from extractAudioData')
                setError(new Error('No data returned from audio extraction'))
                return
            }

            setByteArray(result.data)
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