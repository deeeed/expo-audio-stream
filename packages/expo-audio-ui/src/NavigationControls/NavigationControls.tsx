import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { AudioAnalysis, DataPoint } from '@siteed/expo-audio-stream'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { AudioVisualizerTheme } from '../AudioVisualizer/AudioVisualiser.types'

export interface NavigationControlsProps {
    selectedCandle: DataPoint | null
    selectedIndex: number
    audioData: AudioAnalysis
    currentTime?: number
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
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    navigationButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        marginRight: 16,
    },
    button: {
        backgroundColor: 'transparent',
        padding: 8,
        borderRadius: 8,
        minWidth: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    disabledButton: {
        borderColor: '#CCCCCC',
    },
    buttonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
    disabledButtonText: {
        color: '#CCCCCC',
    },
    counterText: {
        minWidth: 60,
        textAlign: 'center',
        fontSize: 14,
        flexShrink: 1,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
        flexShrink: 0,
    },
    actionButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#007AFF',
        height: 40,
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetButton: {
        backgroundColor: '#FF3B30',
    },
    samplesInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    samplesInfo: {
        fontSize: 14,
        opacity: 0.7,
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
        <View style={styles.samplesInfoContainer}>
            <MaterialCommunityIcons 
                name="waveform" 
                size={16} 
                color={theme.text.color} 
                style={{ opacity: 0.7 }}
            />
            <Text style={[styles.samplesInfo, theme.text]}>
                {audioData.samples.toLocaleString()} audio samples
            </Text>
        </View>
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
                    <Text
                        style={[
                            styles.buttonText,
                            !selectedCandle && styles.disabledButtonText,
                        ]}
                    >
                        ←
                    </Text>
                </TouchableOpacity>

                <Text style={[styles.counterText, theme.text]}>
                    {selectedCandle
                        ? `${selectedIndex + 1} / ${audioData.dataPoints.length}`
                        : `${audioData.dataPoints.length} items`}
                </Text>

                <TouchableOpacity
                    style={[
                        styles.button,
                        !selectedCandle && styles.disabledButton,
                    ]}
                    onPress={onNext}
                    disabled={!selectedCandle}
                >
                    <Text
                        style={[
                            styles.buttonText,
                            !selectedCandle && styles.disabledButtonText,
                        ]}
                    >
                        →
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={onCenter}
                    accessibilityLabel="Select current position"
                >
                    <MaterialIcons name="gps-fixed" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.resetButton]}
                    onPress={onReset}
                    accessibilityLabel="Reset position"
                >
                    <MaterialIcons name="refresh" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    </View>
)

export default NavigationControls
