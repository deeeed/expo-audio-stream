// playground/src/app/(tabs)/play.tsx
import { useFont } from '@shopify/react-native-skia'
import {
    Button,
    LabelSwitch,
    ScreenWrapper,
    useToast,
} from '@siteed/design-system'
import {
    AudioAnalysis,
    AudioRecording,
    Chunk,
    convertPCMToFloat32,
    extractAudioAnalysis,
    getWavFileInfo,
    TranscriberData,
    WavFileInfo,
} from '@siteed/expo-audio-stream'
import { AudioVisualizer } from '@siteed/expo-audio-ui'
import { Audio } from 'expo-av'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text, ActivityIndicator } from 'react-native-paper'

import Transcriber from '../../component/Transcriber'
import { useAudioFiles } from '../../context/AudioFilesProvider'
import { storeAudioFile } from '../../utils/indexedDB'
import { isWeb } from '../../utils/utils'

const logger = console
const getStyles = () => {
    return StyleSheet.create({
        container: {
            padding: 10,
            gap: 10,
            paddingBottom: 80,
        },
        actionsContainer: {
            gap: 10,
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center', // Ensures proper alignment
        },
        audioPlayer: {},
        button: {},
        labelSwitchContainer: {
            margin: 0,
            padding: 10,
            flexShrink: 1, // Ensures label switch can shrink to fit space
        },
    })
}

export const PlayPage = () => {
    const styles = useMemo(() => getStyles(), [])
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
    const audioBufferRef = useRef<ArrayBuffer | null>(null)
    const { show } = useToast()
    const [showVisualizer, setShowVisualizer] = useState<boolean>(true)

    const { files, removeFile, refreshFiles } = useAudioFiles()

    const pickAudioFile = async () => {
        try {
            setProcessing(true)
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
            })

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const uri = result.assets[0].uri
                const name = result.assets[0].name

                // check if it has .wav extension
                if (!name.endsWith('.wav')) {
                    logger.error('Invalid file format')
                    show({
                        type: 'error',
                        message: 'Invalid file format (.wav only)',
                    })
                    return
                }

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
                        algorithm: 'rms',
                    })
                    logger.log(`AudioAnalysis:`, audioAnalysis)
                    setAudioAnalysis(audioAnalysis)
                    setAudioBuffer(uri)
                }
            }
        } catch (error) {
            logger.error('Error picking audio file:', error)
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
            timings['Fetch and Convert Audio'] =
                performance.now() - startFetchAudio

            const startDecodeAudio = performance.now()
            // Decode the audio file to get metadata
            const wavMetadata = await getWavFileInfo(arrayBuffer)
            logger.info(`WavMetadata:`, wavMetadata)
            timings['Decode Audio'] = performance.now() - startDecodeAudio
            audioBufferRef.current = arrayBuffer
            logger.debug(
                `AudioBuffer: ${audioBufferRef.current.byteLength}`,
                arrayBuffer
            )

            const startExtractFileName = performance.now()
            // extract filename from audioUri and remove any query params
            const actualFileName =
                filename ??
                audioUri.split('/').pop()?.split('?')[0] ??
                'Unknown'
            setFileName(actualFileName)
            setAudioUri(audioUri)
            timings['Extract Filename'] =
                performance.now() - startExtractFileName

            const audioCTX = new AudioContext({
                sampleRate: 16000, // Always resample to 16000
            })
            const decoded = await audioCTX.decodeAudioData(arrayBuffer.slice(0))
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
            const { pcmValues: pcmAudio2 } = await convertPCMToFloat32({
                buffer: arrayBuffer,
                bitDepth: wavMetadata.bitDepth,
                skipWavHeader: true,
            })

            // compare the two pcmAudio
            if (pcmAudio.length !== pcmAudio2.length) {
                logger.error('Length mismatch')
                logger.log('pcmAudio:', pcmAudio)
                logger.log('pcmAudio2:', pcmAudio2)
            }
            setAudioBuffer(pcmAudio)

            const startAudioAnalysis = performance.now()
            const audioAnalysis = await extractAudioAnalysis({
                fileUri: audioUri,
                bitDepth: wavMetadata.bitDepth,
                durationMs: wavMetadata.durationMs,
                sampleRate: wavMetadata.sampleRate,
                numberOfChannels: wavMetadata.numChannels,
                arrayBuffer,
                pointsPerSecond: 10,
            })
            logger.info(`AudioAnalysis computed in ${performance.now() - startAudioAnalysis}ms`)
            setAudioAnalysis(audioAnalysis)
            timings['Audio Analysis'] = performance.now() - startAudioAnalysis

            timings['Total Time'] = performance.now() - startOverall

            logger.log('Timings:', timings)
            logger.log(`AudioAnalysis:`, audioAnalysis)
            logger.log(`wavMetadata:`, wavMetadata)
        } catch (error) {
            logger.error('Error loading audio file:', error)
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
        let wavMetadata: WavFileInfo | undefined
        let arrayBuffer: ArrayBuffer | undefined

        if (!fileName || !audioUri) {
            show({ type: 'error', message: 'No file to save' })
            return
        }

        // where to save the file
        const destination = `${FileSystem.documentDirectory ?? ''}${fileName}`

        // Check if similar file already exists by comparing only the last part of the uri
        const fileExists = files.some((file) => file.fileUri === destination)
        if (fileExists) {
            show({ type: 'warning', message: 'File already exists' })
            return
        }

        try {
            // Fetch the audio file as an ArrayBuffer
            const response = await fetch(audioUri)
            arrayBuffer = await response.arrayBuffer()

            // Decode the audio file to get metadata
            wavMetadata = await getWavFileInfo(arrayBuffer)

            // Convert PCM to Float32Array
            const { pcmValues } = await convertPCMToFloat32({
                buffer: arrayBuffer,
                bitDepth: wavMetadata.bitDepth,
                skipWavHeader: false,
            })

            logger.log('pcmValues:', pcmValues.length)
            setAudioBuffer(pcmValues)
        } catch (error) {
            logger.error('Error saving file to files:', error)
            show({ type: 'error', message: 'Error saving file' })
            return
        }

        logger.info(`saveTofiles wavMetadata:`, wavMetadata)
        // Auto copy to local files
        const audioResult: AudioRecording = {
            fileUri: destination,
            filename: fileName,
            mimeType: 'audio/wav',
            size: arrayBuffer.byteLength,
            durationMs: wavMetadata.durationMs,
            sampleRate: wavMetadata.sampleRate,
            channels: wavMetadata.numChannels,
            bitDepth: wavMetadata.bitDepth,
            analysisData: audioAnalysis,
        }

        try {
            if (transcript) {
                audioResult.transcripts = [transcript]
            }

            logger.log('Saving file to files:', audioResult)

            if (isWeb) {
                // Store the audio file and metadata in IndexedDB
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

                // Also save metadata manually on native
                const jsonPath = audioResult.fileUri.replace(/\.wav$/, '.json')
                await FileSystem.writeAsStringAsync(
                    jsonPath,
                    JSON.stringify(audioResult, null, 2)
                )
            }

            // Update your context or state with the new file information
            refreshFiles()
            show({ iconVisible: true, type: 'success', message: 'File saved' })
        } catch (error) {
            logger.error('Error saving file to files:', error)
            // cleanup files if failed
            await removeFile(audioResult)
            throw error
        }
    }, [fileName, audioUri, files, show, transcript, refreshFiles, removeFile, audioAnalysis])

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
        <ScreenWrapper withScrollView contentContainerStyle={styles.container}>
            {isWeb && (
                <LabelSwitch
                    label="Transcription"
                    value={enableTranscription}
                    containerStyle={styles.labelSwitchContainer}
                    onValueChange={setEnableTranscription}
                />
            )}
            <LabelSwitch
                label="Show Visualizer"
                value={showVisualizer}
                containerStyle={styles.labelSwitchContainer}
                onValueChange={setShowVisualizer}
            />
            <View style={styles.actionsContainer}>
                <Button onPress={pickAudioFile} mode="contained">
                    Select Audio File
                </Button>

                <View style={styles.actionsContainer}>
                    {isWeb && (
                        <Button
                            mode="contained"
                            onPress={async () => {
                                try {
                                    await loadWebAudioFile({
                                        audioUri:
                                            'audio_samples/recorder_jre_lex_watch.wav',
                                    })
                                } catch (error) {
                                    logger.error(
                                        'Error loading audio file:',
                                        error
                                    )
                                }
                            }}
                        >
                            Auto Load
                        </Button>
                    )}
                </View>
            </View>
            {processing && <ActivityIndicator size="large" />}
            {audioUri && (
                <View style={{ gap: 10 }}>
                    {showVisualizer && audioAnalysis && (
                        <View>
                            <AudioVisualizer
                                candleSpace={2}
                                mode="static"
                                showRuler
                                showDottedLine
                                font={font ?? undefined}
                                playing={isPlaying}
                                showSelectedCandle={false}
                                showReferenceLine={true}
                                candleWidth={5}
                                enableInertia={false}
                                NavigationControls={() => null}
                                currentTime={currentTime}
                                canvasHeight={150}
                                audioData={audioAnalysis}
                                onSeekEnd={handleSeekEnd}
                            />
                        </View>
                    )}
                    {enableTranscription && audioBuffer && isWeb && (
                        <View>
                            <Transcriber
                                fullAudio={audioBuffer}
                                currentTimeMs={currentTime * 1000}
                                sampleRate={16000} // this was resampled by AudioContext
                                onSelectChunk={handleSelectChunk}
                                onTranscriptionComplete={setTranscript}
                                onTranscriptionUpdate={setTranscript}
                            />
                        </View>
                    )}
                    <Button onPress={playPauseAudio} mode="outlined">
                        {isPlaying ? 'Pause Audio' : 'Play Audio'}
                    </Button>
                </View>
            )}
            <View>
                {fileName && (
                    <View style={{ marginTop: 20, gap: 10 }}>
                        <Text style={styles.audioPlayer}>
                            Selected File: {fileName}
                        </Text>
                        <Button onPress={saveToFiles} mode="contained">
                            Save to Files
                        </Button>
                    </View>
                )}
            </View>
        </ScreenWrapper>
    )
}

export default PlayPage
