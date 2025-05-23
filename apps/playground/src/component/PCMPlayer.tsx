import { useCallback, useEffect, useState, useMemo } from 'react'

import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { Platform, StyleSheet, View } from 'react-native'
import { Button as PaperButton, Text } from 'react-native-paper'

import type { AppTheme } from '@siteed/design-system'
import { useTheme, useToast } from '@siteed/design-system'
import { writeWavHeader } from '@siteed/expo-audio-studio'

import { baseLogger } from '../config'


const logger = baseLogger.extend('PCMPlayer')

interface PCMPlayerProps {
    data: Uint8Array
    sampleRate: number
    bitDepth: number
    channels?: number
    hasWavHeader?: boolean
}

const getStyles = (theme: AppTheme) => StyleSheet.create({
    container: {
        padding: theme.padding.s,
        backgroundColor: theme.colors.secondaryContainer,
        borderRadius: theme.roundness,
        gap: theme.spacing.gap,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.gap,
    },
    iconButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timeInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: theme.padding.s,
    },
    timeText: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: theme.colors.onSecondaryContainer,
    },
})

function formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    const milliseconds = Math.floor(ms % 1000)
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
}

export function PCMPlayer({ 
    data, 
    sampleRate, 
    bitDepth,
    channels = 1,
    hasWavHeader = false,
}: PCMPlayerProps) {
    const theme = useTheme()
    const styles = getStyles(theme)
    const [sound, setSound] = useState<Audio.Sound>()
    const [isPlaying, setIsPlaying] = useState(false)
    const [position, setPosition] = useState(0)
    const { show } = useToast()

    // Memoize the duration calculation to avoid recalculating on every render
    const totalDurationMs = useMemo(() => {
        const bytesPerSample = bitDepth / 8
        const totalSamples = data.length / bytesPerSample
        const durationMs = (totalSamples / (sampleRate * channels)) * 1000
        
        logger?.debug('PCM Player duration calculation (memoized):', {
            dataLength: data.length,
            bytesPerSample,
            totalSamples,
            sampleRate,
            channels,
            totalDurationMs: durationMs,
        })
        
        return durationMs
    }, [data.length, bitDepth, sampleRate, channels])

    const handlePlayPause = useCallback(async () => {
        try {
            if (sound) {
                if (isPlaying) {
                    logger.debug('Pausing playback')
                    await sound.pauseAsync()
                    setIsPlaying(false)
                } else {
                    logger.debug('Resuming playback')
                    await sound.playAsync()
                    setIsPlaying(true)
                }
                return
            }

            logger.debug('Creating new sound with:', {
                sampleRate,
                channels,
                bitDepth,
                dataSize: data.length,
                hasWavHeader,
            })

            let wavBuffer: ArrayBuffer
            
            if (hasWavHeader) {
                // If data already has a WAV header, use it directly
                wavBuffer = data.buffer.slice(0, data.length) as ArrayBuffer
                logger.debug('Using existing WAV header')
            } else {
                // Otherwise, create a WAV header
                const pcmBuffer = data.buffer.slice(0) as ArrayBuffer
                wavBuffer = writeWavHeader({
                    buffer: pcmBuffer.slice(0, data.length),
                    sampleRate,
                    numChannels: channels,
                    bitDepth,
                })
                logger.debug('Created new WAV header')
            }

            let uri: string
            if (Platform.OS === 'web') {
                const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' })
                uri = URL.createObjectURL(wavBlob)
                logger.debug('Created blob URL for web playback:', {
                    wavBufferSize: wavBuffer.byteLength,
                    originalDataSize: data.length,
                })
            } else {
                uri = `${FileSystem.cacheDirectory}temp_audio_${Date.now()}.wav`
                await FileSystem.writeAsStringAsync(
                    uri,
                    arrayBufferToBase64(wavBuffer),
                    { encoding: FileSystem.EncodingType.Base64 }
                )
                logger.debug('Created temporary file for native playback:', uri)
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true }
            )

            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded) {
                    setPosition(status.positionMillis)
                    
                    if (!status.isPlaying && status.didJustFinish) {
                        logger.debug('Playback ended, cleaning up resources')
                        setIsPlaying(false)
                        setPosition(0)
                        if (Platform.OS === 'web') {
                            URL.revokeObjectURL(uri)
                        } else {
                            FileSystem.deleteAsync(uri, { idempotent: true })
                        }
                    }
                }
            })

            setSound(newSound)
            setIsPlaying(true)
            logger.debug('Started playback successfully')
        } catch (error) {
            logger.error('Failed to play audio:', error)
            show({ type: 'error', message: 'Failed to play audio segment' })
        }
    }, [data, sampleRate, channels, bitDepth, hasWavHeader, sound, isPlaying, show])

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync()
            }
        }
    }, [sound])

    return (
        <View style={styles.container}>
            <View style={styles.controls}>
                <PaperButton
                    mode="contained-tonal"
                    onPress={handlePlayPause}
                    style={{ flex: 0 }}
                >
                    <View style={styles.iconButton}>
                        <MaterialCommunityIcons
                            name={isPlaying ? 'pause' : 'play'}
                            size={20}
                            color={theme.colors.onSecondaryContainer}
                        />
                    </View>
                </PaperButton>
                
                <View style={styles.timeInfo}>
                    <Text style={styles.timeText}>
                        {formatDuration(position)}
                    </Text>
                    <Text style={styles.timeText}>
                        {formatDuration(totalDurationMs)}
                    </Text>
                </View>
            </View>
        </View>
    )
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
} 