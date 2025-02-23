import { EditableInfoCard, LabelSwitch, Notice, Picker, ScreenWrapper, useToast } from '@siteed/design-system'
import { AudioAnalysis, DecodingConfig, extractAudioAnalysis  } from '@siteed/expo-audio-stream'
import { AudioVisualizer } from '@siteed/expo-audio-ui'
import * as DocumentPicker from 'expo-document-picker'
import React, { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button } from 'react-native-paper'
import { baseLogger } from '../../config'
import { isWeb } from '../../utils/utils'
import { useFont } from '@shopify/react-native-skia'

const SAMPLE_AUDIO = {
    web: '/audio_samples/jfk.mp3',
    // Add more platform-specific sample paths if needed
}

const logger = baseLogger.extend('ExtractScreen')

interface AudioFile {
    fileUri: string
    mimeType: string
}

export default function ExtractScreen() {
    const [audioData, setAudioData] = useState<AudioAnalysis | null>(null)
    const [currentFile, setCurrentFile] = useState<AudioFile | null>(null)
    const [error, setError] = useState<string>()
    const [isDecodingEnabled, setIsDecodingEnabled] = useState(false)
    const [decodingConfig, setDecodingConfig] = useState<DecodingConfig>({
        targetSampleRate: undefined,
        targetChannels: undefined,
        targetBitDepth: 16,
        normalizeAudio: false
    })
    const [isProcessing, setIsProcessing] = useState(false)

    const { show } = useToast()

    const font = useFont(require('@assets/Roboto/Roboto-Regular.ttf'), 10)

    const loadAudioFile = useCallback(async (fileUri: string) => {
        try {
            setIsProcessing(true)
            show({
                loading: true,
                message: 'Loading audio sample...'
            })

            if (isWeb) {
                const analysis = await extractAudioAnalysis({
                    fileUri,
                    mimeType: 'audio/mp3',
                    decodingOptions: isDecodingEnabled ? decodingConfig : undefined,
                })
                setAudioData(analysis)
                setCurrentFile({ fileUri, mimeType: 'audio/mp3' })
            } else {
                throw new Error('Sample audio is only available on web platform')
            }
            
            show({
                type: 'success',
                message: 'Audio sample loaded successfully',
                stackBehavior: {
                    isStackable: false,
                },
                duration: 2000
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load audio')
            show({
                type: 'error',
                message: 'Failed to load audio sample',
                duration: 3000
            })
            console.error('Error loading audio:', err)
        } finally {
            setIsProcessing(false)
        }
    }, [decodingConfig, isDecodingEnabled, show])

    const pickAudioFile = useCallback(async () => {
        logger.info('Starting audio file picker')
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['audio/*'],
                copyToCacheDirectory: true,
            })

            if (result.canceled) {
                logger.info('User canceled file selection')
                return
            }

            logger.info('File selected', {
                name: result.assets[0].name,
                size: result.assets[0].size,
                mimeType: result.assets[0].mimeType,
                uri: result.assets[0].uri
            })

            setIsProcessing(true)
            show({
                loading: true,
                message: 'Loading audio file...'
            })

            const analysis = await extractAudioAnalysis({
                fileUri: result.assets[0].uri,
                mimeType: result.assets[0].mimeType ?? 'audio/*',
                decodingOptions: isDecodingEnabled ? decodingConfig : undefined,
                logger: logger,
            })

            logger.info('Audio analysis completed', {
                sampleRate: analysis.sampleRate,
                channels: analysis.numberOfChannels,
                duration: analysis.durationMs,
                decodingEnabled: isDecodingEnabled,
                decodingConfig: decodingConfig
            })

            setAudioData(analysis)
            setCurrentFile({
                fileUri: result.assets[0].uri,
                mimeType: result.assets[0].mimeType ?? 'audio/*'
            })
            setError(undefined)

            show({
                type: 'success',
                message: 'Audio file loaded successfully',
                stackBehavior: {
                    isStackable: false,
                },
                duration: 2000
            })
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load audio'
            logger.error('Error processing audio file', {
                error: errorMessage,
                stack: err instanceof Error ? err.stack : undefined
            })

            setError(errorMessage)
            show({
                type: 'error',
                message: 'Failed to load audio file',
                duration: 3000
            })
        } finally {
            setIsProcessing(false)
        }
    }, [decodingConfig, isDecodingEnabled, show])

    const reprocessAudio = useCallback(async () => {
        if (!currentFile) {
            show({
                type: 'warning',
                message: 'No audio file loaded to reprocess',
                duration: 2000
            })
            return
        }

        try {
            setIsProcessing(true)
            show({
                loading: true,
                message: 'Reprocessing audio...'
            })

            const analysis = await extractAudioAnalysis({
                fileUri: currentFile.fileUri,
                mimeType: currentFile.mimeType,
                decodingOptions: isDecodingEnabled ? decodingConfig : undefined,
            })
            
            setAudioData(analysis)
            setError(undefined)

            show({
                type: 'success',
                message: 'Audio reprocessed successfully',
                stackBehavior: {
                    isStackable: false,
                },
                duration: 2000
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reprocess audio')
            show({
                type: 'error',
                message: 'Failed to reprocess audio',
                duration: 3000
            })
            console.error('Error reprocessing audio:', err)
        } finally {
            setIsProcessing(false)
        }
    }, [currentFile, decodingConfig, isDecodingEnabled, show])

    return (
        <ScreenWrapper withScrollView useInsets={false} contentContainerStyle={styles.container}>
            <View style={{ gap: 16 }}>
                <Notice
                    type="info"
                    title="Audio Visualization"
                    message="Select an audio file to visualize its waveform pattern. Supported formats include MP3, WAV, AAC, and more."
                />

                {isWeb && (
                    <Button 
                        mode="contained-tonal" 
                        onPress={() => loadAudioFile(SAMPLE_AUDIO.web)}
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

                <LabelSwitch
                    label="Enable Decoding Options"
                    value={isDecodingEnabled}
                    onValueChange={setIsDecodingEnabled}
                    disabled={isProcessing}
                />

                {isDecodingEnabled && (
                    <>
                        <Picker
                            label="Sample Rate"
                            multi={false}
                            options={[
                                { label: 'Original', value: 'original', selected: !decodingConfig.targetSampleRate },
                                { label: '16000 Hz', value: '16000', selected: decodingConfig.targetSampleRate === 16000 },
                                { label: '44100 Hz', value: '44100', selected: decodingConfig.targetSampleRate === 44100 },
                                { label: '48000 Hz', value: '48000', selected: decodingConfig.targetSampleRate === 48000 },
                            ]}
                            onFinish={(options) => {
                                const selected = options?.find((option) => option.selected)
                                if (!selected) return
                                setDecodingConfig(prev => ({
                                    ...prev,
                                    targetSampleRate: selected.value === 'original' ? undefined : parseInt(selected.value, 10)
                                }))
                            }}
                            disabled={isProcessing}
                        />

                        <Picker
                            label="Channels"
                            multi={false}
                            options={[
                                { label: 'Original', value: 'original', selected: !decodingConfig.targetChannels },
                                { label: 'Mono', value: '1', selected: decodingConfig.targetChannels === 1 },
                                { label: 'Stereo', value: '2', selected: decodingConfig.targetChannels === 2 },
                            ]}
                            onFinish={(options) => {
                                const selected = options?.find((option) => option.selected)
                                if (!selected) return
                                setDecodingConfig(prev => ({
                                    ...prev,
                                    targetChannels: selected.value === 'original' ? undefined : parseInt(selected.value, 10)
                                }))
                            }}
                            disabled={isProcessing}
                        />

                        {audioData && (
                            <Button 
                                mode="contained-tonal" 
                                onPress={reprocessAudio}
                                icon="refresh"
                                loading={isProcessing}
                                disabled={isProcessing}
                            >
                                Reprocess Audio
                            </Button>
                        )}
                    </>
                )}

                {error && (
                    <Notice
                        type="error"
                        title="Error"
                        message={error}
                    />
                )}

                {audioData && !isProcessing && (
                    <View style={{ gap: 16 }}>
                        <EditableInfoCard
                            label="Audio Details"
                            value={`Sample Rate: ${audioData.sampleRate} Hz\nChannels: ${audioData.numberOfChannels}`}
                            editable={false}
                        />
                        <AudioVisualizer 
                            audioData={audioData}
                            canvasHeight={200}
                            showRuler
                            enableInertia
                            NavigationControls={() => null}
                            showSilence
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
})
