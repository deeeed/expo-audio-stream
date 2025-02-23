import { useFont } from '@shopify/react-native-skia'
import { Notice, NumberAdjuster, ScreenWrapper, useTheme, useToast } from '@siteed/design-system'
import { AudioAnalysis, extractPreview } from '@siteed/expo-audio-stream'
import { AudioTimeRangeSelector, AudioVisualizer } from '@siteed/expo-audio-ui'
import * as DocumentPicker from 'expo-document-picker'
import React, { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, IconButton, Text } from 'react-native-paper'
import { baseLogger } from '../../config'
import { isWeb } from '../../utils/utils'

const SAMPLE_AUDIO = {
    web: '/audio_samples/jfk.mp3',
}

const logger = baseLogger.extend('PreviewScreen')

interface AudioFile {
    fileUri: string
    mimeType: string
    filename: string
}

interface QuickTimeRange {
    label: string
    startTime: number
    endTime: number
}

const QUICK_TIME_RANGES: QuickTimeRange[] = [
    { label: 'First 10s', startTime: 0, endTime: 10000 },
    { label: '10-60s', startTime: 10000, endTime: 60000 },
]

export default function PreviewScreen() {
    const theme = useTheme()
    const colors = theme.colors
    const [previewData, setPreviewData] = useState<AudioAnalysis | null>(null)
    const [currentFile, setCurrentFile] = useState<AudioFile | null>(null)
    const [error, setError] = useState<string>()
    const [isProcessing, setIsProcessing] = useState(false)
    const [numberOfPoints, setNumberOfPoints] = useState('100')
    const [startTime, setStartTime] = useState<number>(0)
    const [endTime, setEndTime] = useState<number>(0)
    const [selectedQuickRange, setSelectedQuickRange] = useState<string>()

    const { show } = useToast()
    const font = useFont(require('@assets/Roboto/Roboto-Regular.ttf'), 10)

    const generatePreview = useCallback(async (fileUri: string) => {
        try {
            setIsProcessing(true)
            if (isWeb && fileUri === SAMPLE_AUDIO.web) {
                setCurrentFile({
                    fileUri,
                    mimeType: 'audio/mp3',
                    filename: 'JFK Speech Sample'
                })
            }
            show({
                loading: true,
                message: 'Generating preview...'
            })

            const effectiveStartTime = startTime || 0
            const effectiveEndTime = endTime || 30000

            const preview = await extractPreview({
                fileUri,
                numberOfPoints: parseInt(numberOfPoints, 10),
                startTimeMs: effectiveStartTime,
                endTimeMs: effectiveEndTime,
            })

            logger.info('Preview generated successfully', {
                durationMs: preview.durationMs,
                dataPoints: preview.dataPoints.length,
                top10: preview.dataPoints.slice(0, 10),
            })

            setPreviewData(preview)
            setError(undefined)

            show({
                type: 'success',
                message: 'Preview generated successfully',
                stackBehavior: {
                    isStackable: false,
                },
                duration: 2000
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate preview')
            show({
                type: 'error',
                message: 'Failed to generate preview',
                duration: 3000
            })
            console.error('Error generating preview:', err)
        } finally {
            setIsProcessing(false)
        }
    }, [endTime, numberOfPoints, show, startTime])

    const pickAudioFile = useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['audio/*'],
                copyToCacheDirectory: true,
            })

            if (result.canceled) return

            const newFile = {
                fileUri: result.assets[0].uri,
                mimeType: result.assets[0].mimeType ?? 'audio/*',
                filename: result.assets[0].name ?? 'Unknown'
            }
            
            setCurrentFile(newFile)
            setPreviewData(null)
            setError(undefined)
            
            await generatePreview(newFile.fileUri)
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load audio')
            show({
                type: 'error',
                message: 'Failed to load audio file',
                duration: 3000
            })
        }
    }, [generatePreview, show])

    const handleQuickRangeSelect = useCallback((range: QuickTimeRange) => {
        console.log('Quick range selected:', range)
        setStartTime(range.startTime)
        setEndTime(range.endTime)
        setSelectedQuickRange(range.label)
    }, [])

    const handleTimeInputChange = useCallback((value: number, setter: (value: number) => void) => {
        setter(value)
        setSelectedQuickRange(undefined)
    }, [])

    const handleRangeChange = useCallback((newStartTime: number, newEndTime: number) => {
        setStartTime(newStartTime)
        setEndTime(newEndTime)
        setSelectedQuickRange(undefined)
    }, [])

    return (
        <ScreenWrapper withScrollView useInsets={false} contentContainerStyle={styles.container}>
            <View style={{ gap: 16 }}>
                <Notice
                    type="info"
                    title="Audio Preview"
                    message="Select an audio file to generate a customized preview of its waveform."
                />

                {isWeb && (
                    <Button 
                        mode="contained-tonal" 
                        onPress={() => generatePreview(SAMPLE_AUDIO.web)}
                        icon="music-box"
                        loading={isProcessing}
                        disabled={isProcessing}
                    >
                        Load Sample Audio
                    </Button>
                )}

                <Button 
                    mode="contained" 
                    onPress={pickAudioFile}
                    icon="file-upload"
                    loading={isProcessing}
                    disabled={isProcessing}
                >
                    Select Audio File
                </Button>

                {currentFile && (
                    <View style={{ gap: 16 }}>
                        <View style={{ gap: 8, backgroundColor: colors.secondaryContainer, padding: 16, borderRadius: 8 }}>
                            <Text variant="titleMedium">File Details</Text>
                            <Text>Filename: {currentFile.filename}</Text>
                            <Text>Type: {currentFile.mimeType}</Text>
                        </View>

                        <NumberAdjuster
                            label="Number of Points"
                            value={parseInt(numberOfPoints)}
                            onChange={(value) => setNumberOfPoints(value.toString())}
                            min={10}
                            max={1000}
                            step={10}
                            disabled={isProcessing}
                        />

                        <View style={styles.quickRangeContainer}>
                            {QUICK_TIME_RANGES.map((range) => (
                                <Button
                                    key={range.label}
                                    mode={selectedQuickRange === range.label ? "contained" : "outlined"}
                                    onPress={() => handleQuickRangeSelect(range)}
                                    disabled={isProcessing}
                                >
                                    {range.label}
                                </Button>
                            ))}
                            <IconButton
                                mode={selectedQuickRange === 'reset' ? "contained" : "outlined"}
                                onPress={() => {
                                    setStartTime(0)
                                    setEndTime(0)
                                    setSelectedQuickRange('reset')
                                }}
                                disabled={isProcessing}
                                icon="refresh"
                            />
                        </View>

                        <AudioTimeRangeSelector
                            durationMs={previewData?.durationMs || 0}
                            startTime={startTime}
                            endTime={endTime}
                            onRangeChange={handleRangeChange}
                            disabled={isProcessing || !previewData}
                            theme={{
                                container: {
                                    backgroundColor: colors.surfaceVariant,
                                    height: 40,
                                    borderRadius: 8,
                                },
                                selectedRange: {
                                    backgroundColor: colors.primary,
                                    opacity: 0.5,
                                },
                                handle: {
                                    backgroundColor: colors.primary,
                                    width: 12,
                                },
                            }}
                        />

                        <NumberAdjuster
                            label="Start Time (ms)"
                            value={startTime}
                            onChange={(value) => handleTimeInputChange(value, setStartTime)}
                            min={0}
                            max={999999}
                            step={100}
                            disabled={isProcessing}
                        />

                        <NumberAdjuster
                            label="End Time (ms)"
                            value={endTime}
                            onChange={(value) => handleTimeInputChange(value, setEndTime)}
                            min={0}
                            max={999999}
                            step={100}
                            disabled={isProcessing}
                        />

                        <Button 
                            mode="contained" 
                            onPress={() => generatePreview(currentFile.fileUri)}
                            icon="waveform"
                            loading={isProcessing}
                            disabled={isProcessing}
                        >
                            Generate Preview
                        </Button>
                    </View>
                )}

                {error && (
                    <Notice
                        type="error"
                        title="Error"
                        message={error}
                    />
                )}

                {previewData && !isProcessing && (
                    <View style={{ gap: 16 }}>
                        <View style={{ gap: 8, backgroundColor: colors.secondaryContainer, padding: 16, borderRadius: 8 }}>
                            <Text variant="titleMedium">Preview Details</Text>
                            <Text>Duration: {(previewData.durationMs / 1000).toFixed(1)}s</Text>
                            <Text>Points: {previewData.dataPoints.length}</Text>
                            <Text>Resolution: {(previewData.segmentDurationMs).toFixed(1)}ms per point</Text>
                            {previewData.amplitudeRange && (
                                <Text>
                                    Amplitude Range: {previewData.amplitudeRange.min.toFixed(3)} to{' '}
                                    {previewData.amplitudeRange.max.toFixed(3)}
                                </Text>
                            )}
                        </View>

                        <AudioVisualizer 
                            audioData={previewData}
                            canvasHeight={200}
                            showRuler
                            enableInertia
                            NavigationControls={() => null}
                            font={font ?? undefined}
                            theme={{
                                container: styles.waveformContainer,
                            }}
                        />
                    </View>
                )}
            </View>
        </ScreenWrapper>
    )
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
        padding: 16,
        paddingBottom: 80,
    },
    waveformContainer: {
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    quickRangeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
    },
    quickRangeButton: {
        flex: 1,
        minWidth: 100,
    },
}) 