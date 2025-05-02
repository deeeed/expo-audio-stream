// playground/src/app/(tabs)/play.tsx
import React, { useCallback, useMemo, useState } from 'react'

import { useFont } from '@shopify/react-native-skia'
import { Audio } from 'expo-av'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type {
    AppTheme
} from '@siteed/design-system'
import {
    useTheme,
    useToast,
} from '@siteed/design-system'
import type {
    AudioAnalysis,
    AudioRecording,
    BitDepth,
    CompressionInfo,
    SampleRate,
} from '@siteed/expo-audio-studio'
import {
    extractAudioAnalysis,
    getWavFileInfo,
} from '@siteed/expo-audio-studio'

import { baseLogger } from '../../config'
import { useAudioFiles } from '../../context/AudioFilesProvider'
import { useSampleAudio } from '../../hooks/useSampleAudio'
import { storeAudioFile } from '../../utils/indexedDB'
import { isWeb } from '../../utils/utils'

const logger = console
const getStyles = (theme: AppTheme, insets?: { bottom: number, top: number }) => {
    return StyleSheet.create({
        container: {
            gap: theme.spacing.gap ?? theme.padding.s,
            paddingHorizontal: theme.padding.s,
            paddingBottom: insets?.bottom ?? 80,
            paddingTop: Math.max(insets?.top ?? 0, 10),
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
        },
        waveformContainer: {
            margin: 0,
            padding: 0,
        },
    })
}

export const ImportPage = () => {
    const theme = useTheme()
    const { bottom, top } = useSafeAreaInsets()
    const styles = useMemo(() => getStyles(theme, { bottom, top }), [theme, bottom, top])
    const [audioUri, setAudioUri] = useState<string | null>(null)
    const [sound, setSound] = useState<Audio.Sound | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)
    const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysis>()
    const [_isPlaying, setIsPlaying] = useState<boolean>(false)
    const [_currentTimeMs, setCurrentTimeMs] = useState<number>(0)
    const [_processing, setProcessing] = useState<boolean>(false)
    const _font = useFont(require('@assets/Roboto/Roboto-Regular.ttf'), 10)
    const { show } = useToast()
    const [_showVisualizer, setShowVisualizer] = useState<boolean>(true)
    const [isSaving, setIsSaving] = useState<boolean>(false)
    const [_fileSize, setFileSize] = useState<number>(0)
    const [originalDurationMs, setOriginalDurationMs] = useState<number>(0)
    const [previewStats, setPreviewStats] = useState<{
        durationMs: number;
        size: number;
        originalDurationMs?: number;
        originalSize?: number;
    } | null>(null)

    const { files, refreshFiles } = useAudioFiles()
    const router = useRouter()
    
    const _ = useSampleAudio({
        onError: (error) => {
            logger.error('Error loading sample audio file:', error)
            show({
                type: 'error',
                message: 'Error loading sample audio file',
                duration: 3000,
            })
        },
    })

    const resetUIState = useCallback(() => {
        setAudioUri(null)
        setSound(null)
        setFileName(null)
        setAudioAnalysis(undefined)
        setIsPlaying(false)
        setCurrentTimeMs(0)
        setProcessing(false)
        setShowVisualizer(true)
        setPreviewStats(null)
        
        if (sound) {
            sound.unloadAsync()
        }
    }, [sound])

    const generatePreview = useCallback(async (fileUri: string) => {
        try {
            setProcessing(true)
            show({
                loading: true,
                message: 'Generating preview...',
            })

            logger.debug(`generatePreview`, {
                fileUri,
            })
            // Use extractAudioAnalysis directly instead of preview wrapper
            const audioAnalysis = await extractAudioAnalysis({
                fileUri,
                logger: baseLogger.extend('generatePreview'),
                segmentDurationMs: 100,
            })

            logger.debug(`generatePreview`, audioAnalysis.durationMs)

            // Use the duration directly from audioAnalysis
            const duration = audioAnalysis.durationMs

            if (!originalDurationMs) {
                setOriginalDurationMs(duration)
            }

            if (previewStats?.originalDurationMs !== duration) {
                setPreviewStats({
                    durationMs: duration,
                    size: previewStats?.size ?? 0,
                    originalDurationMs: duration,
                    originalSize: previewStats?.size ?? 0,
                })
            }

            setAudioAnalysis(audioAnalysis)
            
            show({
                type: 'success',
                message: 'Preview generated successfully',
                duration: 2000,
            })
        } catch (error) {
            logger.error('Error generating preview:', error)
            show({
                type: 'error',
                message: 'Failed to generate preview',
                duration: 3000,
            })
        } finally {
            setProcessing(false)
        }
    }, [show, previewStats, originalDurationMs])

    const _pickAudioFile = async () => {
        try {
            setProcessing(true)
            // Reset all values when loading new file
            setPreviewStats(null)
            setCurrentTimeMs(0)
            setIsPlaying(false)
            setAudioAnalysis(undefined)

            const result = await DocumentPicker.getDocumentAsync({
                type: ['audio/*'],
                copyToCacheDirectory: true,
            })

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0]
                const { uri, name, size } = asset
                
                if (!size) {
                    throw new Error('File size not available')
                }

                if (sound) {
                    setSound(null)
                }

                setFileName(name)
                setAudioUri(uri)
                setFileSize(size)

                // Generate preview for visualization
                await generatePreview(uri)
            }
        } catch (error) {
            logger.error('Error picking audio file:', error)
            show({
                type: 'error',
                message: 'Error loading audio file',
                duration: 3000,
            })
        } finally {
            setProcessing(false)
        }
    }

    const _handleSeekEnd = (timeSeconds: number) => {
        logger.debug('handleSeekEnd', timeSeconds * 1000)
        const timeMs = timeSeconds * 1000
        if (sound?._loaded) {
            sound.setPositionAsync(timeMs)
        } else {
            setCurrentTimeMs(timeMs)
        }
    }

    const _playPauseAudio = useCallback(async () => {
        if (sound) {
            const status = await sound.getStatusAsync()
            if (status?.isLoaded) {
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

            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status?.isLoaded) {
                    setCurrentTimeMs(status.positionMillis)
                    setIsPlaying(status.isPlaying)
                }
            })
        }
    }, [audioUri, sound])

    const _saveToFiles = useCallback(async () => {
        if (isSaving || !fileName || !audioUri) {
            show({ type: 'error', message: 'No file to save' })
            return
        }

        setIsSaving(true)
        
        // Ensure the filename has a proper extension
        let finalFileName = fileName
        if (!finalFileName.match(/\.(wav|mp3|opus|aac)$/i)) {
            // Extract extension from the URI if possible
            const uriExtension = audioUri.split('.').pop()?.toLowerCase()
            if (uriExtension && ['wav', 'mp3', 'opus', 'aac'].includes(uriExtension)) {
                finalFileName = `${finalFileName}.${uriExtension}`
            } else {
                // Default to mp3 if we can't determine the extension
                finalFileName = `${finalFileName}.mp3`
            }
            logger.debug(`Added extension to filename: ${finalFileName}`)
        }
        
        const destination = `${FileSystem.documentDirectory ?? ''}${finalFileName}`
        
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

            let wavMetadata
            let compressionInfo: CompressionInfo | undefined

            if (finalFileName.toLowerCase().endsWith('.wav')) {
                try {
                    wavMetadata = await getWavFileInfo(arrayBuffer)
                } catch (_error) {
                    logger.warn('Not a valid WAV file, using audio analysis data instead')
                }
            } else if (finalFileName.match(/\.(mp3|opus|aac)$/i)) {
                // Handle compressed audio formats
                const format = finalFileName.split('.').pop()?.toLowerCase() ?? ''
                compressionInfo = {
                    size: arrayBuffer.byteLength,
                    mimeType: `audio/${format}`,
                    format,
                    bitrate: audioAnalysis?.sampleRate ? audioAnalysis.sampleRate * audioAnalysis.bitDepth : 128000, // fallback to 128kbps
                }
            }

            // Create audio recording metadata using either WAV metadata or audio analysis
            const audioResult: AudioRecording = {
                fileUri: destination,
                filename: finalFileName,
                mimeType: compressionInfo?.mimeType ?? 'audio/*',
                size: arrayBuffer.byteLength,
                // Use WAV metadata if available, otherwise fall back to audio analysis data
                durationMs: wavMetadata?.durationMs ?? audioAnalysis?.durationMs ?? 0,
                sampleRate: (wavMetadata?.sampleRate ?? audioAnalysis?.sampleRate ?? 16000) as SampleRate,
                channels: wavMetadata?.numChannels ?? audioAnalysis?.numberOfChannels ?? 1,
                bitDepth: (wavMetadata?.bitDepth ?? audioAnalysis?.bitDepth ?? 16) as BitDepth,
                analysisData: audioAnalysis,
                compression: compressionInfo ? {
                    ...compressionInfo,
                    compressedFileUri: destination,
                } : undefined,
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

                // Save metadata - ensure the JSON path uses the same filename with .json extension
                const jsonPath = `${FileSystem.documentDirectory}${finalFileName.replace(/\.[^.]+$/, '.json')}`
                await FileSystem.writeAsStringAsync(
                    jsonPath,
                    JSON.stringify(audioResult, null, 2)
                )
            }

            refreshFiles()
            show({ iconVisible: true, type: 'success', message: 'File saved' })
            
            // Reset UI state
            resetUIState()
            
            // Navigate to the file in the files tab - use the filename with extension
            router.push(`(recordings)/${finalFileName}`)
        } catch (error) {
            logger.error('Error saving file:', error)
            show({
                type: 'error',
                message: 'Failed to save file',
                duration: 3000,
            })
        } finally {
            setIsSaving(false)
        }
    }, [isSaving, fileName, audioUri, show, files, audioAnalysis, refreshFiles, resetUIState, router])

    return (
        <View style={styles.container}>
            {/* Rest of the component content */}
        </View>
    )
}