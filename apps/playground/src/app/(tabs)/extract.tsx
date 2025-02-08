import { ScreenWrapper } from '@siteed/design-system'
import { AudioAnalysis, extractAudioFromAnyFormat } from '@siteed/expo-audio-stream'
import { AudioVisualizer } from '@siteed/expo-audio-ui'
import { Asset } from 'expo-asset'
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { isWeb } from '../../utils/utils'

const AUDIO_SAMPLE_PATH = '/audio_samples/jfk.mp3'

export default function ExtractScreen() {
    const [audioData, setAudioData] = useState<AudioAnalysis | null>(null)
    const [error, setError] = useState<string>()

    const loadAudioFile = useCallback(async (fileUri: string) => {
        try {
            if (isWeb) {
                // For web, directly use the URL
                const analysis = await extractAudioFromAnyFormat({
                    fileUri,
                    mimeType: 'audio/mp3',
                })
                setAudioData(analysis)
            } else {
                // For native, use Asset module
                const asset = Asset.fromModule(fileUri)
                await asset.downloadAsync()
                const analysis = await extractAudioFromAnyFormat({
                    fileUri: asset.localUri!
                })
                setAudioData(analysis)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load audio')
            console.error('Error loading audio:', err)
        }
    }, [])

    useEffect(() => {
        loadAudioFile(AUDIO_SAMPLE_PATH)
    }, [loadAudioFile])

    return (
        <ScreenWrapper withScrollView>
            <View style={{ flex: 1, padding: 20, gap: 16 }}>
                <Text variant="titleMedium">Audio Visualization Demo</Text>
                <Text>
                    This page demonstrates the visualization capabilities of the audio analysis tools. 
                    It processes audio files and displays their waveform patterns.
                </Text>

                {isWeb && (
                    <Button 
                        mode="contained" 
                        onPress={() => loadAudioFile(AUDIO_SAMPLE_PATH)}
                    >
                        Reload Sample Audio
                    </Button>
                )}

                {error && <Text style={{ color: 'red' }}>Error: {error}</Text>}
                
                {!audioData && !error && <Text>Loading...</Text>}

                {audioData && (
                    <AudioVisualizer 
                        audioData={audioData}
                        canvasHeight={200}
                        showRuler
                        showYAxis
                        showSilence
                    />
                )}
            </View>
        </ScreenWrapper>
    )
}
