// playground/src/app/(tabs)/play.tsx
import { useFont } from '@shopify/react-native-skia'
import {
    Button,
    LabelSwitch,
    ScreenWrapper,
    useToast,
    Notice,
    useTheme,
    AppTheme,
} from '@siteed/design-system'
import {
    AudioAnalysis,
    AudioRecording,
    BitDepth,
    Chunk,
    convertPCMToFloat32,
    extractAudioAnalysis,
    getWavFileInfo,
    SampleRate,
    TranscriberData,
} from '@siteed/expo-audio-stream'
import { AudioVisualizer } from '@siteed/expo-audio-ui'
import { Audio } from 'expo-av'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { ActivityIndicator, Text } from 'react-native-paper'

import Transcriber from '../../component/Transcriber'
import { useAudioFiles } from '../../context/AudioFilesProvider'
import { storeAudioFile } from '../../utils/indexedDB'
import { isWeb } from '../../utils/utils'
import { RecordingStats } from '../../component/RecordingStats'

const logger = console
const getStyles = (theme: AppTheme) => {
    return StyleSheet.create({
        container: {
            padding: theme.padding.m,
            gap: theme.padding.s,
            paddingBottom: 80,
        },
        controlsContainer: {
            backgroundColor: theme.colors.surfaceVariant,
            padding: theme.padding.m,
            borderRadius: theme.roundness,
            gap: theme.padding.s,
        },
        actionsContainer: {
            gap: theme.padding.s,
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
        },
        fileDetailsContainer: {
            gap: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            padding: 16,
            borderRadius: 8,
        },
        switchesContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.padding.s,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.outline,
            paddingTop: theme.padding.m,
            marginTop: theme.padding.s,
        },
        audioPlayer: {},
        button: {},
        labelSwitchContainer: {
            margin: 0,
            padding: theme.padding.s,
            backgroundColor: theme.colors.surfaceVariant,
            flexShrink: 1,
        },
        disabledContainer: {
            opacity: 0.5,
        },
        visualizerContainer: {
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.roundness,
            overflow: 'hidden',
            padding: 0,
            margin: 0,
        },
        processingContainer: {
            alignItems: 'center',
            gap: theme.padding.s,
            padding: theme.padding.m,
        },
        saveContainer: {
            gap: theme.padding.s,
        }
    })
}

export const PlayPage = () => {
    const theme = useTheme()
    const styles = useMemo(() => getStyles(theme), [theme])
    const [audioUri, setAudioUri] = useState<string | null>(null)
    const [sound, setSound] = useState<Audio.Sound | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)
    const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysis>()
    const [isPlaying, setIsPlaying] = useState<boolean>(false)
    const [currentTime, setCurrentTime] = useState<number>(0)
    const [processing, setProcessing] = useState<boolean>(false)
    const [audioBuffer, setAudioBuffer] = useState<Float32Array | string>()
    const font = useFont(require('@assets/Roboto/Roboto-Regular.ttf'), 10)
    const [enableTranscription, setEnableTranscription] =
        useState<boolean>(isWeb)
    const [transcript, setTranscript] = useState<TranscriberData>()
    const { show } = useToast()
    const [showVisualizer, setShowVisualizer] = useState<boolean>(true)
    const [isSaving, setIsSaving] = useState<boolean>(false)

    const { files, removeFile, refreshFiles } = useAudioFiles()

    const pickAudioFile = async () => {
        try {
            setProcessing(true)
            const result = await DocumentPicker.getDocumentAsync({
                type: ['audio/*'],
                copyToCacheDirectory: true,
            })

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const uri = result.assets[0].uri
                const name = result.assets[0].name

                // Unload any existing sound
                if (sound) {
                    setSound(null)
                }

                setFileName(name)
                if (isWeb) {
                    await loadWebAudioFile({ audioUri: uri, filename: name })
                } else {
                    // Reset playback position and stop playback
                    setAudioUri(uri)
                    setIsPlaying(false)
                    setCurrentTime(0)

                    const audioAnalysis = await extractAudioAnalysis({
                        fileUri: uri,
                        pointsPerSecond: 10,
                    })
                    logger.log(`AudioAnalysis:`, audioAnalysis)
                    setAudioAnalysis(audioAnalysis)
                    setAudioBuffer(uri)
                }
            }
        } catch (error) {
            logger.error('Error picking audio file:', error)
            show({
                type: 'error',
                message: 'Error loading audio file',
                duration: 3000
            })
        } finally {
            setProcessing(false)
        }
    }

    const loadWebAudioFile = async ({
        audioUri,
        filename,
    }: {
        audioUri: string
        filename?: string
    }) => {
        try {
            logger.log('Loading audio file:', audioUri)
            const timings: { [key: string]: number } = {}

            const startOverall = performance.now()

            const startUnloadSound = performance.now()
            // Unload any existing sound
            if (sound) {
                setSound(null)
            }
            timings['Unload Sound'] = performance.now() - startUnloadSound

            const startResetPlayback = performance.now()
            // Reset playback position and stop playback
            setCurrentTime(0)
            setIsPlaying(false)
            setTranscript(undefined)
            timings['Reset Playback'] = performance.now() - startResetPlayback

            const startFetchAudio = performance.now()
            const response = await fetch(audioUri)
            const arrayBuffer = await response.arrayBuffer()
            timings['Fetch and Convert Audio'] = performance.now() - startFetchAudio

            const audioCTX = new AudioContext({
                sampleRate: 16000, // Always resample to 16000
            })
            const decoded = await audioCTX.decodeAudioData(arrayBuffer.slice(0))

            // Convert to mono if stereo
            let pcmAudio: Float32Array
            if (decoded.numberOfChannels === 2) {
                const SCALING_FACTOR = Math.sqrt(2)
                const left = decoded.getChannelData(0)
                const right = decoded.getChannelData(1)

                pcmAudio = new Float32Array(left.length)
                for (let i = 0; i < decoded.length; ++i) {
                    pcmAudio[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2
                }
            } else {
                pcmAudio = decoded.getChannelData(0)
            }

            setAudioBuffer(pcmAudio)

            const startAudioAnalysis = performance.now()
            const audioAnalysis = await extractAudioAnalysis({
                fileUri: audioUri,
                pointsPerSecond: 10,
                arrayBuffer,
                sampleRate: decoded.sampleRate,
                numberOfChannels: decoded.numberOfChannels,
                durationMs: (decoded.length / decoded.sampleRate) * 1000,
            })
            logger.info(`AudioAnalysis computed in ${performance.now() - startAudioAnalysis}ms`)
            setAudioAnalysis(audioAnalysis)
            timings['Audio Analysis'] = performance.now() - startAudioAnalysis

            // extract filename from audioUri and remove any query params
            const actualFileName = filename ?? audioUri.split('/').pop()?.split('?')[0] ?? 'Unknown'
            setFileName(actualFileName)
            setAudioUri(audioUri)

            timings['Total Time'] = performance.now() - startOverall
            logger.log('Timings:', timings)
            logger.log(`AudioAnalysis:`, audioAnalysis)
        } catch (error) {
            logger.error('Error loading audio file:', error)
            show({
                type: 'error',
                message: 'Error loading audio file',
                duration: 3000
            })
        }
    }

    const handleSeekEnd = (newTime: number) => {
        logger.debug('handleSeekEnd', newTime)
        if (sound && sound._loaded) {
            sound.setPositionAsync(newTime * 1000)
        } else {
            setCurrentTime(newTime)
        }
    }

    const playPauseAudio = useCallback(async () => {
        if (sound) {
            const status = await sound.getStatusAsync()
            if (status.isLoaded) {
                if (status.isPlaying) {
                    await sound.pauseAsync()
                    setIsPlaying(false)
                } else {
                    await sound.playAsync()
                    setIsPlaying(true)
                }
            }
        } else if (audioUri) {
            const { sound: newSound } = await Audio.Sound.createAsync({
                uri: audioUri,
            })
            setSound(newSound)
            await newSound.playAsync()
            setIsPlaying(true)

            // Track playback position
            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded) {
                    setCurrentTime(status.positionMillis / 1000)
                    setIsPlaying(status.isPlaying)
                }
            })
        }
    }, [audioUri, sound])

    const saveToFiles = useCallback(async () => {
        if (isSaving || !fileName || !audioUri) {
            show({ type: 'error', message: 'No file to save' })
            return
        }

        setIsSaving(true)
        // where to save the file
        const destination = `${FileSystem.documentDirectory ?? ''}${fileName}`
        
        try {
            // Fetch the audio file
            const response = await fetch(audioUri)
            const arrayBuffer = await response.arrayBuffer()

            // Check if similar file already exists
            const fileExists = files.some((file) => file.fileUri === destination)
            if (fileExists) {
                show({ type: 'warning', message: 'File already exists' })
                return
            }

            // Only try to get WAV metadata if it's a WAV file
            let wavMetadata
            if (fileName.toLowerCase().endsWith('.wav')) {
                try {
                    wavMetadata = await getWavFileInfo(arrayBuffer)
                    const { pcmValues } = await convertPCMToFloat32({
                        buffer: arrayBuffer,
                        bitDepth: wavMetadata.bitDepth,
                    })
                    setAudioBuffer(pcmValues)
                } catch (_error) {
                    logger.warn('Not a valid WAV file, using audio analysis data instead')
                }
            }

            // Create audio recording metadata using either WAV metadata or audio analysis
            const audioResult: AudioRecording = {
                fileUri: destination,
                filename: fileName,
                mimeType: 'audio/*',
                size: arrayBuffer.byteLength,
                // Use WAV metadata if available, otherwise fall back to audio analysis data
                durationMs: wavMetadata?.durationMs ?? audioAnalysis?.durationMs ?? 0,
                sampleRate: (wavMetadata?.sampleRate ?? audioAnalysis?.sampleRate ?? 16000) as SampleRate,
                channels: wavMetadata?.numChannels ?? audioAnalysis?.numberOfChannels ?? 1,
                bitDepth: (wavMetadata?.bitDepth ?? audioAnalysis?.bitDepth ?? 16) as BitDepth,
                analysisData: audioAnalysis,
            }

            if (transcript) {
                audioResult.transcripts = [transcript]
            }

            logger.log('Saving file to files:', audioResult)

            if (isWeb) {
                await storeAudioFile({
                    fileName: audioResult.fileUri,
                    arrayBuffer,
                    metadata: audioResult,
                })
            } else {
                await FileSystem.copyAsync({
                    from: audioUri,
                    to: audioResult.fileUri,
                })

                // Save metadata
                const jsonPath = audioResult.fileUri.replace(/\.[^.]+$/, '.json')
                await FileSystem.writeAsStringAsync(
                    jsonPath,
                    JSON.stringify(audioResult, null, 2)
                )
            }

            refreshFiles()
            show({ iconVisible: true, type: 'success', message: 'File saved' })
        } catch (error) {
            logger.error('Error saving file to files:', error)
            show({ type: 'error', message: 'Error saving file' })
            // cleanup files if failed
            await removeFile({
                fileUri: destination,
                filename: fileName,
                mimeType: 'audio/*',
                size: 0,
                durationMs: 0,
                sampleRate: 16000 as SampleRate,
                channels: 1,
                bitDepth: 16 as BitDepth,
            })
            throw error
        } finally {
            setIsSaving(false)
        }
    }, [fileName, audioUri, files, show, transcript, refreshFiles, removeFile, audioAnalysis, isSaving])

    const handleSelectChunk = ({ chunk }: { chunk: Chunk }) => {
        if (chunk.timestamp && chunk.timestamp.length > 0) {
            setCurrentTime(chunk.timestamp[0])
        }
    }

    useEffect(() => {
        return sound
            ? () => {
                  logger.log('Unloading sound')
                  sound.unloadAsync()
              }
            : undefined
    }, [sound])

    return (
        <ScreenWrapper 
            withScrollView 
            contentContainerStyle={styles.container}
        >
            <Notice
                type="info"
                title="Audio Analysis"
                message="Select an audio file to analyze its waveform. Save to Files to enable detailed segment analysis and feature extraction."
            />

            <View 
                style={[
                    styles.controlsContainer, 
                    processing || isSaving ? styles.disabledContainer : null
                ]}
            >
                <View style={styles.actionsContainer}>
                    <Button 
                        onPress={pickAudioFile} 
                        mode="contained"
                        disabled={processing || isSaving}
                        icon="file-upload"
                    >
                        Select Audio File
                    </Button>

                    {isWeb && (
                        <Button
                            mode="contained-tonal"
                            disabled={processing || isSaving}
                            icon="music-box"
                            onPress={async () => {
                                try {
                                    await loadWebAudioFile({
                                        audioUri: 'audio_samples/recorder_jre_lex_watch.wav',
                                    })
                                } catch (error) {
                                    logger.error('Error loading audio file:', error)
                                }
                            }}
                        >
                            Load Sample
                        </Button>
                    )}
                </View>

                <View style={styles.switchesContainer}>
                    {isWeb && (
                        <LabelSwitch
                            disabled={processing || isSaving}
                            label="Transcription"
                            value={enableTranscription}
                            containerStyle={styles.labelSwitchContainer}
                            onValueChange={setEnableTranscription}
                        />
                    )}
                    <LabelSwitch
                        disabled={processing || isSaving}
                        label="Waveform"
                        value={showVisualizer}
                        containerStyle={styles.labelSwitchContainer}
                        onValueChange={setShowVisualizer}
                    />
                </View>
            </View>

            {(processing || isSaving) && (
                <View style={styles.processingContainer}>
                    <ActivityIndicator 
                        size="large"
                        color={theme.colors.primary}
                    />
                    <Text variant="bodyLarge">
                        {isSaving ? 'Saving file...' : 'Processing audio...'}
                    </Text>
                </View>
            )}

            {audioUri && audioAnalysis && (
                <View style={[{gap: 10},processing || isSaving ? styles.disabledContainer : null]}>
                    <RecordingStats
                        duration={audioAnalysis.durationMs}
                        size={audioAnalysis.samples * (audioAnalysis.bitDepth / 8)}
                        sampleRate={audioAnalysis.sampleRate}
                        bitDepth={audioAnalysis.bitDepth}
                        channels={audioAnalysis.numberOfChannels}
                    />

                    {showVisualizer && (
                        <View style={styles.visualizerContainer}>
                            <AudioVisualizer
                                candleSpace={2}
                                mode="static"
                                showRuler
                                showDottedLine
                                font={font ?? undefined}
                                playing={isPlaying}
                                showSelectedCandle={false}
                                showReferenceLine={true}
                                amplitudeScaling='raw'
                                candleWidth={5}
                                enableInertia={false}
                                NavigationControls={() => null}
                                currentTime={currentTime}
                                canvasHeight={150}
                                audioData={audioAnalysis}
                                onSeekEnd={handleSeekEnd}
                                theme={{
                                    container: {
                                        margin: 0,
                                        padding: 0,
                                    },
                                    canvasContainer: {
                                        backgroundColor: theme.colors.surfaceVariant,
                                        margin: 0,
                                        padding: 0,
                                    },
                                    buttonText: {
                                        color: theme.colors.primary,
                                    },
                                    timeRuler: {
                                        labelColor: theme.colors.onSurface,
                                        tickColor: theme.colors.onSurface,
                                    },
                                    text: { color: theme.colors.onSurface },
                                }}
                            />
                        </View>
                    )}

                    {enableTranscription && audioBuffer && isWeb && (
                        <Transcriber
                            fullAudio={audioBuffer}
                            currentTimeMs={currentTime * 1000}
                            sampleRate={16000}
                            onSelectChunk={handleSelectChunk}
                            onTranscriptionComplete={setTranscript}
                            onTranscriptionUpdate={setTranscript}
                        />
                    )}

                    <Button 
                        onPress={playPauseAudio} 
                        mode="contained"
                        disabled={processing || isSaving}
                        icon={isPlaying ? 'pause' : 'play'}
                    >
                        {isPlaying ? 'Pause Audio' : 'Play Audio'}
                    </Button>
                </View>
            )}

            {fileName && (
                <View style={styles.saveContainer}>
                    <Button 
                        onPress={saveToFiles} 
                        mode="contained"
                        disabled={processing || isSaving}
                        loading={isSaving}
                        icon="content-save"
                    >
                        {isSaving ? 'Saving...' : 'Save to Files'}
                    </Button>
                </View>
            )}
        </ScreenWrapper>
    )
}

export default PlayPage
