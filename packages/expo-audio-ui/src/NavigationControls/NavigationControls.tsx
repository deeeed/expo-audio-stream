import { AudioAnalysis, DataPoint } from '@siteed/expo-audio-stream'
import React from 'react'
import { Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { AudioVisualizerTheme } from '../AudioVisualizer/AudioVisualiser.types'

export interface NavigationControlsProps {
    selectedCandle: DataPoint | null
    selectedIndex: number
    audioData: AudioAnalysis
    onPrev: () => void
    onNext: () => void
    onReset: () => void
    onCenter?: () => void
    theme: AudioVisualizerTheme
}

const styles = StyleSheet.create({
    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginTop: 10,
    },
    navigationButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 8,
        minWidth: 60,
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.5,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    resetButton: {
        backgroundColor: '#FF3B30',
    },
    text: {
        fontSize: 16,
    },
})

const NavigationControls: React.FC<NavigationControlsProps> = ({
    selectedCandle,
    selectedIndex,
    audioData,
    onPrev,
    onNext,
    onReset,
    onCenter,
    theme,
}) => (
    <View style={theme.navigationContainer}>
        <Text style={theme.text}>{audioData.samples} samples</Text>
        <View style={styles.controlsContainer}>
            <View style={styles.navigationButtons}>
                <TouchableOpacity
                    style={[
                        styles.button,
                        !selectedCandle && styles.disabledButton,
                    ]}
                    onPress={onPrev}
                    disabled={!selectedCandle}
                >
                    <Text style={[styles.buttonText, theme.text]}>{'<'}</Text>
                </TouchableOpacity>

                {selectedCandle ? (
                    <Text
                        style={theme.text}
                    >{`${selectedIndex + 1} / ${audioData.dataPoints.length}`}</Text>
                ) : (
                    <Text style={theme.text}>
                        {audioData.dataPoints.length} items
                    </Text>
                )}
                <TouchableOpacity
                    style={[
                        styles.button,
                        !selectedCandle && styles.disabledButton,
                    ]}
                    onPress={onNext}
                    disabled={!selectedCandle}
                >
                    <Text style={[styles.buttonText, theme.text]}>{'>'}</Text>
                </TouchableOpacity>
            </View>
            <Button title="Select" onPress={onCenter} />
            <Button onPress={onReset} title="X" />
        </View>
    </View>
)

export default NavigationControls
