import React, { useCallback, useMemo, useState } from 'react'

import * as DocumentPicker from 'expo-document-picker'
import { LayoutChangeEvent, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { AppTheme } from '@siteed/design-system'
import { Notice, NumberAdjuster, ScreenWrapper, useTheme, useToast } from '@siteed/design-system'
import type { MelSpectrogram } from '@siteed/audio-studio'
import { extractMelSpectrogram, MAX_DURATION_MS } from '@siteed/audio-studio'
import { MelSpectrogramVisualizer } from '@siteed/audio-ui'

import { baseLogger } from '../config'
import { useSampleAudio } from '../hooks/useSampleAudio'
import { isWeb } from '../utils/utils'
import { useScreenHeader } from '../hooks/useScreenHeader'

const SAMPLE_AUDIO_WEB = '/audio_samples/jfk.mp3'

const logger = baseLogger.extend('MelSpectrogramScreen')

interface AudioFile {
    fileUri: string
    filename: string
}

const getStyles = ({ theme, insets }: { theme: AppTheme; insets?: { bottom: number } }) =>
    StyleSheet.create({
        container: {
            gap: theme.spacing.gap || 16,
            paddingHorizontal: theme.padding.s,
            paddingBottom: insets?.bottom || 80,
            paddingTop: 0,
        },
        card: {
            gap: 4,
            backgroundColor: theme.colors.secondaryContainer,
            padding: 16,
            borderRadius: 8,
        },
        mono: {
            fontFamily: 'monospace',
            fontSize: 11,
        },
    })

export default function MelSpectrogramScreen() {
    const theme = useTheme()
    const { bottom, top } = useSafeAreaInsets()
    const styles = useMemo(() => getStyles({ theme, insets: { bottom } }), [theme, bottom])
    const { show } = useToast()

    const [currentFile, setCurrentFile] = useState<AudioFile | null>(null)
    const [melData, setMelData] = useState<MelSpectrogram | null>(null)
    const [error, setError] = useState<string>()
    const [isProcessing, setIsProcessing] = useState(false)
    const [containerWidth, setContainerWidth] = useState(300)

    // Configurable params
    const [nMels, setNMels] = useState(40)
    const [windowSizeMs, setWindowSizeMs] = useState(25)
    const [hopLengthMs, setHopLengthMs] = useState(10)
    const [startTimeMs, setStartTimeMs] = useState(0)
    const [endTimeMs, setEndTimeMs] = useState(5000)

    const { isLoading: isSampleLoading, loadSampleAudio } = useSampleAudio({
        onError: (err) => {
            logger.error('Error loading sample:', err)
            show({ type: 'error', message: 'Error loading sample audio', duration: 3000 })
        },
    })

    useScreenHeader({
        title: 'Mel Spectrogram',
        backBehavior: { fallbackUrl: '/more' },
    })

    const computeMelSpectrogram = useCallback(
        async (fileUri: string) => {
            try {
                setIsProcessing(true)
                setError(undefined)
                show({ loading: true, message: 'Computing mel spectrogram...' })

                const result = await extractMelSpectrogram({
                    fileUri,
                    nMels,
                    windowSizeMs,
                    hopLengthMs,
                    startTimeMs: startTimeMs || undefined,
                    endTimeMs: endTimeMs || undefined,
                })

                logger.info('Mel spectrogram computed', {
                    timeSteps: result.timeSteps,
                    nMels: result.nMels,
                    durationMs: result.durationMs,
                    sampleRate: result.sampleRate,
                })

                setMelData(result)
                show({
                    type: 'success',
                    message: 'Mel spectrogram computed',
                    stackBehavior: { isStackable: false },
                    duration: 2000,
                })
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Failed to compute mel spectrogram'
                setError(msg)
                show({ type: 'error', message: msg, duration: 3000 })
                logger.error('Error computing mel spectrogram:', err)
            } finally {
                setIsProcessing(false)
            }
        },
        [nMels, windowSizeMs, hopLengthMs, startTimeMs, endTimeMs, show]
    )

    const pickAudioFile = useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['audio/*'],
                copyToCacheDirectory: true,
            })
            if (result.canceled) return

            const newFile = {
                fileUri: result.assets[0].uri,
                filename: result.assets[0].name ?? 'Unknown',
            }
            setCurrentFile(newFile)
            setMelData(null)
            setError(undefined)
        } catch (err) {
            show({ type: 'error', message: 'Failed to load audio file', duration: 3000 })
        }
    }, [show])

    const handleLoadSample = useCallback(async () => {
        try {
            setIsProcessing(true)

            if (isWeb) {
                setCurrentFile({ fileUri: SAMPLE_AUDIO_WEB, filename: 'JFK Speech Sample' })
                setMelData(null)
                setError(undefined)
                return
            }

            const sampleFile = await loadSampleAudio(require('@assets/jfk.mp3'))
            if (!sampleFile) throw new Error('Failed to load sample audio file')

            setCurrentFile({ fileUri: sampleFile.uri, filename: 'JFK Speech Sample' })
            setMelData(null)
            setError(undefined)
        } catch (err) {
            show({ type: 'error', message: 'Failed to load sample audio', duration: 3000 })
        } finally {
            setIsProcessing(false)
        }
    }, [loadSampleAudio, show])

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        const w = e.nativeEvent.layout.width
        if (w > 0) setContainerWidth(w)
    }, [])

    // Format first 3 frames x 5 bins for numerical comparison
    const numericalPreview = useMemo(() => {
        if (!melData) return null
        const lines: string[] = []
        const maxFrames = Math.min(3, melData.timeSteps)
        const maxBins = Math.min(5, melData.nMels)
        for (let t = 0; t < maxFrames; t++) {
            const frame = melData.spectrogram[t]
            if (!frame) continue
            const vals = frame.slice(0, maxBins).map((v) => v.toFixed(4)).join(', ')
            lines.push(`[${t}] ${vals}`)
        }
        return lines.join('\n')
    }, [melData])

    return (
        <ScreenWrapper withScrollView useInsets={false} contentContainerStyle={styles.container}>
            <View style={{ gap: 16 }} onLayout={handleLayout}>
                <Notice
                    type="info"
                    title="Mel Spectrogram"
                    message="Extract and visualize mel spectrograms from audio files. Compare values across platforms."
                />

                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button
                        mode="contained"
                        onPress={pickAudioFile}
                        icon="file-upload"
                        disabled={isProcessing}
                        style={{ flex: 1 }}
                    >
                        Select File
                    </Button>
                    <Button
                        mode="contained-tonal"
                        onPress={handleLoadSample}
                        icon="music-box"
                        loading={isSampleLoading}
                        disabled={isProcessing}
                    >
                        Load Sample
                    </Button>
                </View>

                {currentFile && (
                    <View style={{ gap: 16 }}>
                        <View style={styles.card}>
                            <Text variant="titleMedium">File: {currentFile.filename}</Text>
                        </View>

                        <NumberAdjuster
                            label="nMels"
                            value={nMels}
                            onChange={setNMels}
                            min={10}
                            max={128}
                            step={10}
                            disabled={isProcessing}
                        />
                        <NumberAdjuster
                            label="Window Size (ms)"
                            value={windowSizeMs}
                            onChange={setWindowSizeMs}
                            min={5}
                            max={100}
                            step={5}
                            disabled={isProcessing}
                        />
                        <NumberAdjuster
                            label="Hop Length (ms)"
                            value={hopLengthMs}
                            onChange={setHopLengthMs}
                            min={1}
                            max={50}
                            step={1}
                            disabled={isProcessing}
                        />
                        <NumberAdjuster
                            label="Start Time (ms)"
                            value={startTimeMs}
                            onChange={setStartTimeMs}
                            min={0}
                            max={999999}
                            step={100}
                            disabled={isProcessing}
                        />
                        <NumberAdjuster
                            label="End Time (ms)"
                            value={endTimeMs}
                            onChange={setEndTimeMs}
                            min={0}
                            max={startTimeMs + MAX_DURATION_MS}
                            step={100}
                            disabled={isProcessing}
                        />

                        <Button
                            mode="contained"
                            onPress={() => computeMelSpectrogram(currentFile.fileUri)}
                            icon="chart-bar"
                            loading={isProcessing}
                            disabled={isProcessing}
                        >
                            Compute
                        </Button>
                    </View>
                )}

                {error && <Notice type="error" title="Error" message={error} />}

                {melData && !isProcessing && (
                    <View style={{ gap: 16 }}>
                        <View style={styles.card}>
                            <Text variant="titleMedium">Results</Text>
                            <Text>Time Steps: {melData.timeSteps}</Text>
                            <Text>nMels: {melData.nMels}</Text>
                            <Text>Duration: {(melData.durationMs / 1000).toFixed(2)}s</Text>
                            <Text>Sample Rate: {melData.sampleRate} Hz</Text>
                        </View>

                        {numericalPreview && (
                            <View style={styles.card}>
                                <Text variant="titleMedium">Sample Values (first 3 frames x 5 bins)</Text>
                                <Text style={styles.mono}>{numericalPreview}</Text>
                            </View>
                        )}

                        <View style={styles.card}>
                            <Text variant="titleMedium">Heatmap</Text>
                            <MelSpectrogramVisualizer
                                data={melData}
                                width={containerWidth - 32}
                                height={200}
                            />
                        </View>
                    </View>
                )}
            </View>
        </ScreenWrapper>
    )
}
