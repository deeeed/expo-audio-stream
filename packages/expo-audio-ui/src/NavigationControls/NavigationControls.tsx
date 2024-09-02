import { AudioAnalysis, DataPoint } from '@siteed/expo-audio-stream'
import React from 'react'
import { Button, Text, View } from 'react-native'

import { AudioVisualizerTheme } from '../AudioVisualizer/AudioVisualiser.types'

export interface NavigationControlsProps {
    selectedCandle: DataPoint | null
    selectedIndex: number
    audioData: AudioAnalysis
    onPrev: () => void
    onNext: () => void
    onReset: () => void
    theme: AudioVisualizerTheme
}

const NavigationControls: React.FC<NavigationControlsProps> = ({
    selectedCandle,
    selectedIndex,
    audioData,
    onPrev,
    onNext,
    onReset,
    theme,
}) => (
    <View style={theme.navigationContainer}>
        <Text style={theme.text}>{audioData.samples} samples</Text>
        <View
            style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                width: '100%',
            }}
        >
            <View
                style={{
                    flexDirection: 'row',
                    gap: 10,
                    alignItems: 'center',
                }}
            >
                <Button title="<" onPress={onPrev} disabled={!selectedCandle} />

                {selectedCandle ? (
                    <Text
                        style={theme.text}
                    >{`${selectedIndex + 1} / ${audioData.dataPoints.length}`}</Text>
                ) : (
                    <Text style={theme.text}>
                        {audioData.dataPoints.length} items
                    </Text>
                )}
                <Button title=">" onPress={onNext} disabled={!selectedCandle} />
            </View>
            <Button onPress={onReset} title="Reset" />
        </View>
    </View>
)

export default NavigationControls
