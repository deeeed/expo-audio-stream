// playground/src/component/AudioRecording.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons'
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
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import React, { useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { ActivityIndicator, Text } from 'react-native-paper'
import { atob } from 'react-native-quick-base64'

import { baseLogger } from '../config'
import { useAudio } from '../hooks/useAudio'
import { isWeb } from '../utils/utils'
import {
    AudioRecordingAnalysisConfig,
    SelectedAnalysisConfig,
} from './AudioRecordingAnalysisConfig'
import { SelectedAudioVisualizerProps } from './AudioRecordingConfigForm'
import { DataPointViewer } from './DataViewer'
import { HexDataViewer } from './HexDataViewer'
import { RecordingStats } from './RecordingStats'
import Transcript from './Transcript'
import { SegmentAnalyzer } from './features/SegmentAnalyzer'

const logger = baseLogger.extend('AudioRecording')

const getStyles = ({
    isPlaying,
    theme,
}: {
    isPlaying: boolean
    theme: AppTheme
}) => {
    return StyleSheet.create({
        container: {
            padding: theme.padding.m,
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            marginHorizontal: theme.margin.s,
            elevation: 2,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
        },
        titleContainer: {
            flex: 1,
        },
        title: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.colors.onSurface,
        },
        subtitle: {
            fontSize: 14,
            color: theme.colors.onSurfaceVariant,
            marginTop: 4,
        },
        playbackContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginVertical: 12,
            backgroundColor: theme.colors.surfaceVariant,
            padding: 12,
            borderRadius: 8,
        },
        formatBadge: {
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 4,
            backgroundColor: theme.colors.secondaryContainer,
        },
        formatText: {
            color: theme.colors.onSecondaryContainer,
            fontSize: 12,
            fontWeight: '600',
        },
        actionButtons: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 12,
        },
        primaryActions: {
            flexDirection: 'row',
            gap: 8,
            flex: 1,
        },
        secondaryActions: {
            flexDirection: 'row',
            gap: 8,
        },
        iconButton: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
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
        attributeContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingVertical: 4,
        },
        label: { 
            fontWeight: 'bold',
            color: theme.colors.secondary,
        },
        value: { 
            color: theme.colors.text,
        },
        infoSection: {
            backgroundColor: theme.colors.surface,
            borderRadius: 8,
            // padding: theme.padding.s,
            marginVertical: 8,
        },
        compressionRate: {
            alignSelf: 'flex-end',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 4,
            fontSize: 12,
            fontWeight: '600',
            backgroundColor: theme.colors.successContainer,
            color: theme.colors.success,
            marginTop: 4,
        },
        buttonGroups: {
            marginTop: 16,
        },
    })
}

interface InfoRowProps {
    readonly label: string
    readonly value: string | number | React.ReactNode
    readonly styles: ReturnType<typeof getStyles>
}

function InfoRow({ label, value, styles }: InfoRowProps) {
    return (
        <View style={styles.attributeContainer}>
            <Text style={styles.label}>{label}:</Text>
            {typeof value === 'string' || typeof value === 'number' ? (
                <Text style={styles.value}>{value}</Text>
            ) : (
                value
            )}
        </View>
    )
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
                mfcc: true,
                tonnetz: true,
                melSpectrogram: true,
                spectralContrast: true,
                pitch: true,
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
            extractAnalysis: extractAnalysis,
            analysisOptions: selectedAnalysisConfig,
        },
    })
    const [hexByteArray, setHexByteArray] = useState<Uint8Array>()
    const [activeFormat, setActiveFormat] = useState<'wav' | 'compressed'>(
        recording.compression ? 'compressed' : 'wav'
    )

    const audioAnalysis = actualAnalysis ?? _audioAnalysis

    const styles = useMemo(
        () => getStyles({ isPlaying, theme }),
        [isPlaying, theme]
    )
    const { openDrawer } = useModal()

    const handleShare = async (fileUri: string = audioUri) => {
        if (!fileUri) {
            show({ type: 'error', message: 'No file to share' })
            return
        }

        try {
            const isAvailable = await Sharing.isAvailableAsync()
            if (!isAvailable) {
                alert('Sharing is not available on your platform')
                return
            }

            await Sharing.shareAsync(fileUri)
        } catch (error) {
            logger.error('Error sharing the audio file:', error)
            show({ type: 'error', message: 'Failed to share the file' })
        }
    }

    const handleSaveToDisk = async (fileUri: string = recording.fileUri, isCompressed = false) => {
        if (!isWeb) {
            logger.warn('Save to disk is only supported on web')
            return
        }

        const a = document.createElement('a')
        a.href = fileUri
        const suffix = isCompressed ? '_compressed' : ''
        a.download = `rec_${recording.fileUri}${suffix}_${recording?.sampleRate ?? 'NOSAMPLE'}_${recording?.bitDepth ?? 'NOBITDEPTH'}.${isCompressed ? recording.compression?.mimeType?.split('/')[1] : 'wav'}`
        a.click()
    }

    const handlePlayPause = async () => {
        try {
            if (isPlaying) {
                pause()
            } else {
                // Get the appropriate URI based on format
                const audioUriToPlay = activeFormat === 'compressed' && recording.compression?.compressedFileUri
                    ? recording.compression.compressedFileUri
                    : recording.fileUri

                if (isWeb) {
                    // For web, directly use the blob URL without file:// prefix
                    const cleanUri = audioUriToPlay.replace('file://', '')
                    logger.debug(`Playing web audio from: ${cleanUri}`)
                    await play({ audioUri: cleanUri })
                } else {
                    // For native platforms, ensure proper file:// prefix
                    const formattedUri = audioUriToPlay.startsWith('file://')
                        ? audioUriToPlay
                        : `file://${audioUriToPlay}`

                    // Remove any double file:// prefixes
                    const cleanUri = formattedUri.replace(/^file:\/\/file:\/\//, 'file://')
                    
                    logger.debug(`Playing native audio from: ${cleanUri}`)
                    
                    // Verify file exists before playing
                    const fileInfo = await FileSystem.getInfoAsync(cleanUri)
                    if (!fileInfo.exists) {
                        // Try alternative path format
                        const alternativePath = cleanUri.replace('file://', '')
                        const alternativeFileInfo = await FileSystem.getInfoAsync(alternativePath)
                        if (!alternativeFileInfo.exists) {
                            throw new Error(`File does not exist at either path:\n${cleanUri}\n${alternativePath}`)
                        }
                        logger.debug(`File exists at alternative path with size: ${alternativeFileInfo.size} bytes`)
                        await play({ audioUri: alternativePath })
                    } else {
                        logger.debug(`File exists with size: ${fileInfo.size} bytes`)
                        await play({ audioUri: cleanUri })
                    }
                }
            }
        } catch (error) {
            logger.error('Error playing audio:', error)
            show({ 
                type: 'error', 
                message: `Failed to play audio file: ${error instanceof Error ? error.message : 'Unknown error'}`
            })
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

        const loadHexData = async () => {
            try {
                const position = selectedDataPoint.startPosition ?? 0
                const length = (selectedDataPoint.endPosition ?? 0) - (selectedDataPoint.startPosition ?? 0)
                let byteArray: Uint8Array = new Uint8Array()
    
                // Check if the file is compressed (opus or aac)
                const isCompressedFormat = audioUri.toLowerCase().match(/\.(opus|aac)$/)
    
                if (isWeb) {
                    const response = await fetch(audioUri, {
                        headers: {
                            Range: `bytes=${position}-${position + length - 1}`,
                        },
                    })
                    const step = await response.text()
                    byteArray = Uint8Array.from(step, (c) => c.charCodeAt(0))
                } else {
                    // Ensure proper file:// prefix for native platforms
                    const fileUri = audioUri.startsWith('file://') 
                        ? audioUri 
                        : `file://${audioUri}`
    
                    // For compressed formats, read the whole file and slice it
                    if (isCompressedFormat) {
                        const response = await FileSystem.readAsStringAsync(fileUri, {
                            encoding: FileSystem.EncodingType.Base64,
                        })
                        const fullArray = Uint8Array.from(atob(response), c => c.charCodeAt(0))
                        byteArray = fullArray.slice(position, position + length)
                    } else {
                        // For WAV files, read specific portions
                        const response = await FileSystem.readAsStringAsync(
                            fileUri,
                            {
                                encoding: FileSystem.EncodingType.Base64,
                                position: selectedDataPoint.startPosition,
                                length,
                            }
                        )
                        const step = atob(response)
                        byteArray = Uint8Array.from(step, (c) => c.charCodeAt(0))
                    }
                }
    
                setHexByteArray(byteArray)
            } catch (error) {
                logger.error('Failed to load hex data', error)
                show({ 
                    type: 'error', 
                    message: `Failed to load audio data segment: ${error instanceof Error ? error.message : 'Unknown error'}` 
                })
            }
        }

        loadHexData()
    }, [recording, selectedDataPoint, audioAnalysis, audioUri, show])

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>{recording.filename}</Text>
                    <Text style={styles.subtitle}>
                        {new Date(recording.createdAt ?? Date.now()).toLocaleString()}
                    </Text>
                </View>
                {recording.compression?.compressedFileUri && (
                    <View style={styles.formatBadge}>
                        <Text style={styles.formatText}>
                            {recording.compression.format.toUpperCase()}
                        </Text>
                    </View>
                )}
            </View>

            <RecordingStats
                duration={recording.durationMs}
                size={recording.size}
                sampleRate={recording.sampleRate}
                bitDepth={recording.bitDepth}
                channels={recording.channels}
                compression={recording.compression}
            />

            <View style={styles.playbackContainer}>
                <Button 
                    mode="contained"
                    onPress={handlePlayPause}
                    style={{ flex: 1 }}
                >
                    <View style={styles.iconButton}>
                        <MaterialCommunityIcons
                            name={isPlaying ? "pause" : "play"}
                            size={20}
                            color={theme.colors.onPrimary}
                        />
                        <Text>
                            {isPlaying ? 'Pause' : `Play ${activeFormat === 'compressed' ? '(Compressed)' : '(WAV)'}`}
                        </Text>
                    </View>
                </Button>
                
                {recording.compression?.compressedFileUri && (
                    <Button
                        mode="outlined"
                        onPress={() => setActiveFormat(activeFormat === 'wav' ? 'compressed' : 'wav')}
                    >
                        <MaterialCommunityIcons
                            name="swap-horizontal"
                            size={20}
                            color={theme.colors.primary}
                        />
                    </Button>
                )}
            </View>

            <View style={styles.actionButtons}>
                <View style={styles.primaryActions}>
                    {onActionPress && (
                        <Button 
                            mode="contained-tonal"
                            onPress={onActionPress}
                            style={{ flex: 1 }}
                        >
                            <View style={styles.iconButton}>
                                <MaterialCommunityIcons
                                    name="waveform"
                                    size={20}
                                    color={theme.colors.onSecondaryContainer}
                                />
                                <Text>{actionText ?? 'Visualize'}</Text>
                            </View>
                        </Button>
                    )}
                </View>

                <View style={styles.secondaryActions}>
                    {!isWeb && (
                        <Button 
                            mode="outlined"
                            onPress={() => handleShare(activeFormat === 'compressed' ? recording.compression?.compressedFileUri : recording.fileUri)}
                        >
                            <View style={styles.iconButton}>
                                <MaterialCommunityIcons
                                    name="share"
                                    size={20}
                                    color={theme.colors.primary}
                                />
                                <Text>Share</Text>
                            </View>
                        </Button>
                    )}

                    {isWeb && (
                        <Button 
                            mode="outlined"
                            onPress={() => handleSaveToDisk(
                                activeFormat === 'compressed' ? recording.compression?.compressedFileUri : recording.fileUri,
                                activeFormat === 'compressed'
                            )}
                        >
                            <View style={styles.iconButton}>
                                <MaterialCommunityIcons
                                    name="download"
                                    size={20}
                                    color={theme.colors.primary}
                                />
                                <Text>Save</Text>
                            </View>
                        </Button>
                    )}

                    {onDelete && (
                        <Button
                            mode="outlined"
                            buttonColor={theme.colors.errorContainer}
                            textColor={theme.colors.error}
                            onPress={onDelete}
                        >
                            <MaterialCommunityIcons
                                name="delete"
                                size={20}
                                color={theme.colors.error}
                            />
                        </Button>
                    )}
                </View>
            </View>

            {processing && <View style={{ justifyContent: 'center', alignItems: 'center', marginVertical: 20 }}><ActivityIndicator /></View>}

            {!processing && audioAnalysis && (
                <View style={styles.infoSection}>
                    <EditableInfoCard
                        label="Analysis Config"
                        value={JSON.stringify(selectedAnalysisConfig)}
                        containerStyle={{
                            margin: 0,
                            backgroundColor: theme.colors.surface,
                        }}
                        editable
                        onEdit={async () => {
                            const newConfig = await openDrawer<SelectedAnalysisConfig>({
                                bottomSheetProps: {
                                    enableDynamicSizing: true,
                                },
                                initialData: selectedAnalysisConfig,
                                containerType: 'scrollview',
                                footerType: 'confirm_cancel',
                                render: ({ state, onChange }) => (
                                    <AudioRecordingAnalysisConfig
                                        config={state.data}
                                        onChange={onChange}
                                    />
                                ),
                            })
                            if (newConfig) {
                                setSelectedAnalysisConfig(newConfig)
                                setSelectedDataPoint(undefined)
                            }
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
                        disableTapSelection={false}
                        enableInertia
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
                    <SegmentAnalyzer
                        dataPoint={selectedDataPoint}
                        fileUri={audioUri}
                        sampleRate={recording.sampleRate}
                        onError={(error) => show({ 
                            type: 'error', 
                            message: error.message 
                        })}
                        analysisConfig={{
                            pointsPerSecond: selectedAnalysisConfig.pointsPerSecond ?? 10,
                            features: selectedAnalysisConfig.features,
                        }}
                    />
                    <DataPointViewer dataPoint={selectedDataPoint} />
                    <InfoRow 
                        label="Byte Range" 
                        value={
                            <Text style={styles.value}>
                                {`${selectedDataPoint.startPosition} to ${selectedDataPoint.endPosition}`}
                            </Text>
                        }
                        styles={styles}
                    />
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
        </View>
    )
}
