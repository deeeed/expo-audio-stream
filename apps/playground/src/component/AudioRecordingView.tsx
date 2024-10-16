// playground/src/component/AudioRecording.tsx
import { useFont } from '@shopify/react-native-skia'
import {
    AppTheme,
    Button,
    EditableInfoCard,
    useModal,
    useTheme,
    useToast,
} from '@siteed/design-system'
import {
    AudioAnalysis,
    AudioRecording,
    Chunk,
    DataPoint,
} from '@siteed/expo-audio-stream'
import { AudioVisualizer } from '@siteed/expo-audio-ui'
import { getLogger } from '@siteed/react-native-logger'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import React, { useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { ActivityIndicator, Text } from 'react-native-paper'
import { atob } from 'react-native-quick-base64'

import {
    AudioRecordingAnalysisConfig,
    SelectedAnalysisConfig,
} from './AudioRecordingAnalysisConfig'
import { SelectedAudioVisualizerProps } from './AudioRecordingConfigForm'
import { DataPointViewer } from './DataViewer'
import { HexDataViewer } from './HexDataViewer'
import Transcript from './Transcript'
import { useAudio } from '../hooks/useAudio'
import { formatBytes, formatDuration, isWeb } from '../utils/utils'

const logger = getLogger('AudioRecording')

const getStyles = ({
    isPlaying,
    theme,
}: {
    isPlaying: boolean
    theme: AppTheme
}) => {
    return StyleSheet.create({
        container: {
            padding: 20,
            borderBottomWidth: 3,
            borderColor: isPlaying ? theme.colors.primary : theme.colors.border,
        },
        detailText: {
            fontSize: 16,
            marginBottom: 5,
        },
        positionText: {
            fontSize: 16,
            marginBottom: 5,
            fontWeight: isPlaying ? 'bold' : 'normal',
        },
        buttons: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            marginTop: 10,
        },
        attributeContainer: {
            flexDirection: 'row',
            gap: 5,
        },
        label: { fontWeight: 'bold' },
        value: {},
    })
}

export interface AudioRecordingViewProps {
    recording: AudioRecording
    audioAnalysis?: AudioAnalysis
    actionText?: string
    visualConfig?: SelectedAudioVisualizerProps
    showTranscript?: boolean
    extractAnalysis?: boolean
    onActionPress?: () => void
    onDelete?: () => Promise<void>
}
export const AudioRecordingView = ({
    recording,
    actionText,
    audioAnalysis: _audioAnalysis,
    extractAnalysis,
    visualConfig,
    showTranscript,
    onActionPress,
    onDelete,
}: AudioRecordingViewProps) => {
    const { show } = useToast()
    const audioUri = recording.fileUri
    const font = useFont(require('@assets/Roboto/Roboto-Regular.ttf'), 10)
    const theme = useTheme()
    const [selectedDataPoint, setSelectedDataPoint] = useState<DataPoint>()
    const [selectedAnalysisConfig, setSelectedAnalysisConfig] =
        useState<SelectedAnalysisConfig>({
            pointsPerSecond: 10,
            skipWavHeader: true,
            algorithm: 'peak',
            features: {
                energy: true,
                spectralCentroid: true,
                spectralFlatness: true,
                chromagram: true,
                hnr: true,
                spectralBandwidth: true,
                spectralRolloff: true,
                tempo: true,
                zcr: true,
                rms: true,
                mfcc: false,
            },
        })

    const {
        isPlaying,
        audioAnalysis: actualAnalysis,
        processing,
        position,
        play,
        pause,
        updatePlaybackOptions,
    } = useAudio({
        audioUri,
        recording,
        options: {
            extractAnalysis: extractAnalysis && !_audioAnalysis,
            analysisOptions: selectedAnalysisConfig,
        },
    })
    const [hexByteArray, setHexByteArray] = useState<Uint8Array>()

    const audioAnalysis = actualAnalysis ?? _audioAnalysis

    const styles = useMemo(
        () => getStyles({ isPlaying, theme }),
        [isPlaying, theme]
    )
    const { openDrawer, dismiss } = useModal()

    const handleShare = async () => {
        if (!audioUri) {
            show({ type: 'error', message: 'No file to share' })
            return
        }

        try {
            const isAvailable = await Sharing.isAvailableAsync()
            if (!isAvailable) {
                alert('Sharing is not available on your platform')
                return
            }

            await Sharing.shareAsync(audioUri)
        } catch (error) {
            logger.error('Error sharing the audio file:', error)
            show({ type: 'error', message: 'Failed to share the file' })
        }
    }

    const handleSaveToDisk = async () => {
        if (!isWeb) {
            logger.warn('Save to disk is only supported on web')
            return
        }

        const a = document.createElement('a')
        a.href = recording.fileUri
        a.download = `rec_${recording.fileUri}_${recording?.sampleRate ?? 'NOSAMPLE'}_${recording?.bitDepth ?? 'NOBITDEPTH'}.wav`
        a.click()
    }

    const handlePlayPause = async () => {
        try {
            if (isPlaying) {
                pause()
            } else {
                play()
            }
        } catch (error) {
            logger.error('Error playing audio:', error)
        }
    }

    const handleOnSeekEnd = async (newtime: number) => {
        try {
            logger.log('Seeking to:', newtime)

            if (isPlaying) {
                await pause()
            }
            await updatePlaybackOptions({ position: newtime * 1000 })
        } catch (error) {
            logger.error('Error seeking audio:', error)
            show({ type: 'error', message: 'Failed to seek audio' })
        }
    }

    const handleSelection = ({
        dataPoint,
        index,
    }: {
        dataPoint: DataPoint
        index: number
    }) => {
        logger.log(`Selected data point index=${index}`, dataPoint)
        setSelectedDataPoint(dataPoint)
    }

    const handleTranscriptSelection = async ({ chunk }: { chunk: Chunk }) => {
        try {
            logger.log(`Selected transcript chunk`, chunk)
            await updatePlaybackOptions({ position: chunk.timestamp[0] * 1000 })
        } catch (error) {
            logger.error('Error seeking audio:', error)
            show({ type: 'error', message: 'Failed to seek audio' })
        }
    }

    useEffect(() => {
        if (!selectedDataPoint) return

        // Use expo file system api to load 200bytes of string as unicode
        const loadHexData = async () => {
            try {
                const position = selectedDataPoint.startPosition ?? 0
                const length =
                    (selectedDataPoint.endPosition ?? 0) -
                    (selectedDataPoint.startPosition ?? 0)
                let byteArray: Uint8Array = new Uint8Array()
                // Load hex data from uri
                if (isWeb) {
                    const response = await fetch(audioUri, {
                        headers: {
                            Range: `bytes=${position}-${position + length - 1}`,
                        },
                    })
                    const step = await response.text()
                    byteArray = Uint8Array.from(step, (c) => c.charCodeAt(0))
                } else {
                    const fileData = await FileSystem.readAsStringAsync(
                        audioUri,
                        {
                            encoding: FileSystem.EncodingType.Base64,
                            position: selectedDataPoint.startPosition,
                            length,
                        }
                    )
                    console.debug(`Loaded file data:`, fileData)
                    const step = atob(fileData)
                    byteArray = Uint8Array.from(step, (c) => c.charCodeAt(0))
                }

                setHexByteArray(byteArray)
            } catch (error) {
                logger.error('Failed to load hex data', error)
            }
        }

        loadHexData()
    }, [recording, selectedDataPoint, audioAnalysis])

    return (
        <View style={styles.container}>
            <Text style={[styles.detailText, { fontWeight: 'bold' }]}>
                {recording.filename}
            </Text>
            <Text style={styles.detailText}>
                Duration: {formatDuration(recording.durationMs)}
            </Text>
            <Text style={styles.detailText}>
                Size: {formatBytes(recording.size)}
            </Text>
            <Text style={styles.detailText}>Format: {recording.mimeType}</Text>

            {recording.sampleRate ? (
                <Text style={styles.detailText}>
                    Sample Rate: {recording.sampleRate} Hz
                </Text>
            ) : null}

            {recording.channels ? (
                <Text style={styles.detailText}>
                    Channels: {recording.channels}
                </Text>
            ) : null}

            {recording.bitDepth ? (
                <Text style={styles.detailText}>
                    Bit Depth: {recording.bitDepth}
                </Text>
            ) : null}

            <Text style={[styles.positionText]}>
                Position: {(position / 1000).toFixed(2)}
            </Text>

            {processing && <ActivityIndicator />}

            {audioAnalysis && (
                <View>
                    <EditableInfoCard
                        label="Analysis Config"
                        value={JSON.stringify(selectedAnalysisConfig)}
                        containerStyle={{
                            margin: 0,
                            backgroundColor: theme.colors.surface,
                        }}
                        editable
                        onEdit={async () => {
                            logger.log('Edit analysis config')
                            openDrawer({
                                bottomSheetProps: {
                                    enableDynamicSizing: true,
                                },
                                render: () => (
                                    <AudioRecordingAnalysisConfig
                                        config={selectedAnalysisConfig}
                                        onChange={(newConfig) => {
                                            dismiss()
                                            setSelectedAnalysisConfig(newConfig)
                                            setSelectedDataPoint(undefined)
                                        }}
                                    />
                                ),
                            })
                        }}
                    />
                    <AudioVisualizer
                        {...visualConfig}
                        playing={isPlaying}
                        font={font ?? undefined}
                        onSelection={handleSelection}
                        currentTime={position / 1000}
                        audioData={audioAnalysis}
                        onSeekEnd={handleOnSeekEnd}
                        theme={{
                            buttonText: {
                                color: theme.colors.primary,
                            },
                            timeRuler: {
                                labelColor: theme.colors.text,
                                tickColor: theme.colors.text,
                            },
                            text: { color: theme.colors.text },
                            canvasContainer: {
                                backgroundColor: theme.colors.surface,
                            },
                        }}
                    />
                </View>
            )}

            {selectedDataPoint && (
                <View>
                    <DataPointViewer dataPoint={selectedDataPoint} />
                    <View style={styles.attributeContainer}>
                        <Text style={styles.label}>Byte Range:</Text>
                        <Text style={styles.value}>
                            {selectedDataPoint.startPosition} to{' '}
                            {selectedDataPoint.endPosition}
                        </Text>
                    </View>
                    {hexByteArray && (
                        <HexDataViewer
                            byteArray={hexByteArray}
                            bitDepth={recording.bitDepth}
                        />
                    )}
                </View>
            )}

            {showTranscript && recording.transcripts && (
                <Transcript
                    transcribedData={recording.transcripts}
                    currentTimeMs={position}
                    onSelectChunk={handleTranscriptSelection}
                />
            )}

            <View style={styles.buttons}>
                {onActionPress && (
                    <Button onPress={onActionPress}>
                        {actionText ?? 'Action'}
                    </Button>
                )}
                <Button onPress={handlePlayPause}>
                    {isPlaying ? 'Pause' : 'Play'}
                </Button>
                {isWeb ? (
                    <Button onPress={handleSaveToDisk}>Save</Button>
                ) : (
                    <Button onPress={handleShare}>Share</Button>
                )}
                {onDelete && (
                    <Button
                        buttonColor={theme.colors.error}
                        textColor={theme.colors.onError}
                        onPress={onDelete}
                    >
                        Delete
                    </Button>
                )}
            </View>
        </View>
    )
}
