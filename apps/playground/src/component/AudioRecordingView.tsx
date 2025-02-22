// playground/src/component/AudioRecording.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFont } from '@shopify/react-native-skia'
import {
    AppTheme,
    Button,
    useModal,
    useTheme,
    useToast
} from '@siteed/design-system'
import {
    AudioAnalysis,
    AudioFeaturesOptions,
    AudioRecording,
    Chunk,
    DataPoint,
} from '@siteed/expo-audio-stream'
import { AudioVisualizer } from '@siteed/expo-audio-ui'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { StyleSheet, View } from 'react-native'
import { ActivityIndicator, Text } from 'react-native-paper'
import { atob } from 'react-native-quick-base64'

import { baseLogger } from '../config'
import { useAudio } from '../hooks/useAudio'
import { isWeb } from '../utils/utils'
import { SelectedAudioVisualizerProps } from './AudioRecordingConfigForm'
import { SegmentAnalyzer } from './features/SegmentAnalyzer'
import { FeatureSelection } from './FeatureSelection'
import { HexDataViewer } from './HexDataViewer'
import { RecordingStats } from './RecordingStats'
import { SegmentDuration, SegmentDurationSelector } from './SegmentDurationSelector'
import Transcript from './Transcript'

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
        segmentDurationContainer: {
            marginBottom: 12,
        },
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
    
    // New state for analysis configuration
    const [segmentDuration, setSegmentDuration] = useState<SegmentDuration>(100) // 100ms default
    const [features, setFeatures] = useState<AudioFeaturesOptions>({
        mfcc: false,
        energy: false,
        zcr: false,
        spectralCentroid: false,
        spectralFlatness: false,
        spectralRolloff: false,
        spectralBandwidth: false,
        chromagram: false,
        tempo: false,
        hnr: false,
        melSpectrogram: false,
        spectralContrast: false,
        tonnetz: false,
        pitch: false,
    })

    // Create a memoized analysis config that includes both segment duration and features
    const analysisConfig = useMemo(() => ({
        pointsPerSecond: 1000 / segmentDuration,
        features: {}, // Ignore features since we compute them on selection
    }), [segmentDuration])

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
            analysisOptions: analysisConfig, // Pass the memoized config
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

    // Add this theme configuration
    const visualizerTheme = useMemo(() => ({
        buttonText: {
            color: theme.colors.primary,
        },
        timeRuler: {
            labelColor: theme.colors.text,
            tickColor: theme.colors.text,
        },
        dottedLineColor: theme.colors.outline,
        yAxis: {
            labelColor: theme.colors.text,
            tickColor: theme.colors.text,
        },
        container: {
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: 20,
            padding: 5,
        },
        text: { 
            color: theme.colors.text 
        },
        canvasContainer: {
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: 20,
        }
    }), [theme])

    // Add this near other state declarations
    const [webAudioBuffer, setWebAudioBuffer] = useState<Uint8Array>()

    // Add a separate effect to load the buffer once for web
    useEffect(() => {
        if (!isWeb || webAudioBuffer) return

        const loadWebAudioBuffer = async () => {
            try {
                const response = await fetch(audioUri)
                const arrayBuffer = await response.arrayBuffer()
                const fullArray = new Uint8Array(arrayBuffer)
                setWebAudioBuffer(fullArray)
            } catch (error) {
                logger.error('Failed to load web audio buffer:', error)
                show({ 
                    type: 'error', 
                    message: `Failed to load audio file: ${error instanceof Error ? error.message : 'Unknown error'}` 
                })
            }
        }

        loadWebAudioBuffer()
    }, [audioUri, show, webAudioBuffer])

    const loadHexData = useCallback(async () => {
        try {
            if (!selectedDataPoint) return
            const position = Math.floor(selectedDataPoint.startTime ?? 0)
            const length = Math.floor((selectedDataPoint.endTime ?? 0) - (selectedDataPoint.startTime ?? 0))
            
            logger.debug('Loading hex data:', {
                position,
                length,
                selectedDataPoint,
                isCompressedFormat: audioUri.toLowerCase().match(/\.(opus|aac)$/)
            })

            let byteArray: Uint8Array = new Uint8Array()
            const isCompressedFormat = audioUri.toLowerCase().match(/\.(opus|aac)$/)

            if (isWeb) {
                if (!webAudioBuffer) return
                byteArray = webAudioBuffer.slice(position, position + length)
                
                logger.debug('Sliced buffer:', {
                    originalSize: webAudioBuffer.length,
                    sliceStart: position,
                    sliceEnd: position + length,
                    resultSize: byteArray.length,
                    firstFewBytes: Array.from(byteArray.slice(0, 10)).map(b => b.toString(16)).join(' ')
                })
            } else {
                // Native platform code
                const fileUri = audioUri.startsWith('file://') 
                    ? audioUri 
                    : `file://${audioUri}`

                if (isCompressedFormat) {
                    // For compressed formats, read entire file
                    const response = await FileSystem.readAsStringAsync(fileUri, {
                        encoding: FileSystem.EncodingType.Base64,
                    })
                    const fullArray = Uint8Array.from(atob(response), c => c.charCodeAt(0))
                    byteArray = fullArray.slice(position, position + length)
                } else {
                    // For WAV, we can read specific ranges
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

            // After setting byteArray, log its contents
            logger.debug('Final byteArray:', {
                size: byteArray.length,
                firstFewBytes: Array.from(byteArray.slice(0, 10)).map(b => b.toString(16)).join(' '),
                position,
                length
            })

            setHexByteArray(byteArray)
        } catch (error) {
            logger.error('Failed to load hex data', error)
            show({ type: 'error', message: `Failed to load audio data segment: ${error instanceof Error ? error.message : 'Unknown error'}` })
        }
    }, [selectedDataPoint, audioUri, show, webAudioBuffer])

    useEffect(() => {
        if (!selectedDataPoint) return
        loadHexData()
    }, [selectedDataPoint, loadHexData])

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
                            {isPlaying ? 'Pause' : `Play ${activeFormat === 'compressed' ? '(Compressed)' : ''}`}
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

            {extractAnalysis && (
                <View style={{marginTop: 20, gap: 10}}>
                    <Button
                        mode="outlined"
                        onPress={async () => {
                            const newFeatures = await openDrawer<AudioFeaturesOptions>({
                                initialData: features,
                                containerType: 'scrollview',
                                footerType: 'confirm_cancel',
                                render: ({state, onChange }) => (
                                    <FeatureSelection
                                        features={state.data}
                                        onChange={onChange}
                                    />
                                ),
                            })
                            if(newFeatures) {
                                setFeatures(newFeatures)
                            }
                        }}
                    >
                        <View style={styles.iconButton}>
                            <MaterialCommunityIcons
                                name="equalizer"
                                size={20}
                                color={theme.colors.primary}
                            />
                            <Text>Audio Features Extraction</Text>
                        </View>
                    </Button>
                    <View style={styles.segmentDurationContainer}>
                        <SegmentDurationSelector
                            value={segmentDuration}
                            onChange={setSegmentDuration}
                            maxDurationMs={recording.durationMs}
                        />
                    </View>
                </View>
            )}

            {processing && <View style={{ justifyContent: 'center', alignItems: 'center', marginVertical: 20 }}><ActivityIndicator /></View>}

            {!processing && audioAnalysis && (
                <View style={styles.infoSection}>
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
                        theme={visualizerTheme}
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
                            pointsPerSecond: 1000 / segmentDuration,
                            features,
                        }}
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
