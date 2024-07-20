// playground/src/app/(tabs)/play.tsx
import { Button, ScreenWrapper, useToast } from '@siteed/design-system'
import {
    AudioAnalysisData,
    AudioRecording,
    extractAudioAnalysis,
    getWavFileInfo,
} from '@siteed/expo-audio-stream'
import { AudioVisualizer } from '@siteed/expo-audio-ui'
import { useLogger } from '@siteed/react-native-logger'
import { Audio } from 'expo-av'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ActivityIndicator } from 'react-native-paper'

import { useAudioFiles } from '../../context/AudioFilesProvider'
import { storeAudioFile } from '../../utils/indexedDB'
import { isWeb } from '../../utils/utils'

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
        },
        audioPlayer: {},
        button: {},
    })
}

export const PlayPage = () => {
    const styles = useMemo(() => getStyles(), [])
    const [audioUri, setAudioUri] = useState<string | null>(null)
    const [sound, setSound] = useState<Audio.Sound | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)
    const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysisData>()
    const [isPlaying, setIsPlaying] = useState<boolean>(false)
    const [currentTime, setCurrentTime] = useState<number>(0)
    const [processing, setProcessing] = useState<boolean>(false)
    const { show } = useToast()

    const { files, removeFile, refreshFiles } = useAudioFiles()
    const { logger } = useLogger('PlayPage')

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

                // Reset playback position and stop playback
                setAudioUri(uri)
                setFileName(name)
                setIsPlaying(false)
                setCurrentTime(0)
                // Unload any existing sound
                if (sound) {
                    setSound(null)
                }

                const audioAnalysis = await extractAudioAnalysis({
                    fileUri: uri,
                    pointsPerSecond: 10,
                    algorithm: 'rms',
                })
                logger.log(`AudioAnalysis:`, audioAnalysis)
                setAudioAnalysis(audioAnalysis)
            }
        } catch (error) {
            logger.error('Error picking audio file:', error)
        } finally {
            setProcessing(false)
        }
    }

    const loadWebAudioFile = async ({ audioUri }: { audioUri: string }) => {
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

            const startExtractFileName = performance.now()
            // extract filename from audioUri and remove any query params
            const fileName =
                audioUri.split('/').pop()?.split('?')[0] ?? 'Unknown'
            setFileName(fileName)
            setAudioUri(audioUri)
            timings['Extract Filename'] =
                performance.now() - startExtractFileName

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
            logger.info(`AudioAnalysis:`, audioAnalysis)
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
        if (sound && sound._loaded) {
            sound.setPositionAsync(newTime * 1000)
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

        // Fetch the audio file as an ArrayBuffer
        const response = await fetch(audioUri)
        const arrayBuffer = await response.arrayBuffer()

        // Decode the audio file to get metadata
        const wavMetadata = await getWavFileInfo(arrayBuffer)

        logger.info(`saveTofiles wavMetadata:`, wavMetadata)
        // Auto copy to local files
        const audioResult: AudioRecording = {
            fileUri: destination,
            filename: fileName,
            mimeType: 'audio/wav',
            wavPCMData: arrayBuffer,
            size: arrayBuffer.byteLength,
            durationMs: wavMetadata.durationMs,
            sampleRate: wavMetadata.sampleRate,
            channels: wavMetadata.numChannels,
            bitDepth: wavMetadata.bitDepth,
        }

        logger.log('Saving file to files:', audioResult)
        try {
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
            await removeFile(audioResult.fileUri)
            throw error
        }
    }, [files, fileName, audioUri, logger, refreshFiles, show])

    useEffect(() => {
        return sound
            ? () => {
                  logger.log('Unloading sound')
                  sound.unloadAsync()
              }
            : undefined
    }, [sound, logger])

    return (
        <ScreenWrapper withScrollView contentContainerStyle={styles.container}>
            <View style={styles.actionsContainer}>
                <Button onPress={pickAudioFile} mode="contained">
                    Select Audio File
                </Button>
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
                                logger.error('Error loading audio file:', error)
                            }
                        }}
                    >
                        Auto Load
                    </Button>
                )}
            </View>
            {processing && <ActivityIndicator size="large" />}
            {audioUri && (
                <View style={{ gap: 10 }}>
                    {audioAnalysis && (
                        <>
                            <AudioVisualizer
                                candleSpace={2}
                                mode="static"
                                showRuler
                                showDottedLine
                                playing={isPlaying}
                                candleWidth={5}
                                currentTime={currentTime}
                                canvasHeight={300}
                                audioData={audioAnalysis}
                                onSeekEnd={handleSeekEnd}
                            />
                        </>
                    )}
                    <Button onPress={playPauseAudio} mode="outlined">
                        {isPlaying ? 'Pause Audio' : 'Play Audio'}
                    </Button>
                </View>
            )}
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
        </ScreenWrapper>
    )
}

export default PlayPage
