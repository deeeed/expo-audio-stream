import {
    NumberAdjuster,
    Text,
    useTheme
} from '@siteed/design-system'
import React, { useCallback, useEffect, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { SegmentedButtons } from 'react-native-paper'
import {
    BatchTranscriptionOptions,
    RealtimeTranscriptionOptions
} from '../hooks/useUnifiedTranscription'
import { TranscriptionModeSettings } from './TranscriptionModeConfig'

interface TranscriptionModeConfigFormProps {
    settings: TranscriptionModeSettings;
    onSettingsChange: (settings: TranscriptionModeSettings) => void;
    isWeb?: boolean;
}

export const TranscriptionModeConfigForm = ({
    settings,
    onSettingsChange,
    isWeb = false
}: TranscriptionModeConfigFormProps) => {
    const { colors } = useTheme();
    
    // Remove the local state entirely and use the props directly
    // This prevents state synchronization issues
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Debounced update function
    const updateSettings = useCallback((updatedSettings: TranscriptionModeSettings) => {
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }
        
        updateTimeoutRef.current = setTimeout(() => {
            onSettingsChange(updatedSettings);
        }, 100);
    }, [onSettingsChange]);
    
    // Handle mode selection
    const handleModeChange = useCallback(
        (mode: string) => {
            updateSettings({
                ...settings,
                mode: mode as 'realtime' | 'batch',
            });
        },
        [settings, updateSettings]
    );

    // Handle realtime options change
    const handleRealtimeChange = useCallback(
        (key: keyof RealtimeTranscriptionOptions, value: number) => {
            updateSettings({
                ...settings,
                realtimeOptions: {
                    ...settings.realtimeOptions,
                    [key]: value
                }
            });
        },
        [settings, updateSettings]
    );

    // Handle batch options change
    const handleBatchChange = useCallback(
        (key: keyof BatchTranscriptionOptions, value: number) => {
            updateSettings({
                ...settings,
                batchOptions: {
                    ...settings.batchOptions,
                    [key]: value
                }
            });
        },
        [settings, updateSettings]
    );

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
    }, []);

    const dynamicStyles = StyleSheet.create({
        modeInfoContainer: {
            backgroundColor: colors.surfaceVariant,
            padding: 8,
            borderRadius: 4,
            marginBottom: 16,
        }
    });

    return (
        <View style={styles.container}>
            {/* Mode Selection */}
            <View style={styles.sectionHeader}>
                <Text variant="titleMedium">Transcription Mode</Text>
            </View>
            
            {/* Only show segmented buttons if there are multiple options */}
            {!isWeb ? (
                <View style={styles.segmentedButtonContainer}>
                    <SegmentedButtons
                        value={settings.mode}
                        onValueChange={handleModeChange}
                        buttons={[
                            {
                                value: 'realtime',
                                label: 'Realtime'
                            },
                            {
                                value: 'batch',
                                label: 'Batch'
                            }
                        ]}
                    />
                </View>
            ) : (
                <View style={dynamicStyles.modeInfoContainer}>
                    <Text variant="bodyMedium">Using Batch mode for web platform</Text>
                </View>
            )}

            {/* Realtime Options - only for native */}
            {settings.mode === 'realtime' && !isWeb && (
                <>
                    <View style={styles.sectionHeader}>
                        <Text variant="titleMedium">Realtime Settings</Text>
                    </View>
                    
                    <View style={styles.optionContainer}>
                        <NumberAdjuster
                            label="Minimum Audio (seconds)"
                            value={settings.realtimeOptions.realtimeAudioMinSec ?? 1}
                            onChange={(value) => handleRealtimeChange('realtimeAudioMinSec', value)}
                            min={0.5}
                            max={5}
                            step={0.5}
                        />
                        <Text variant="bodySmall" style={styles.description}>
                            Minimum audio required before processing
                        </Text>
                    </View>
                    
                    <View style={styles.optionContainer}>
                        <NumberAdjuster
                            label="Audio Buffer (seconds)"
                            value={settings.realtimeOptions.realtimeAudioSec ?? 300}
                            onChange={(value) => handleRealtimeChange('realtimeAudioSec', value)}
                            min={30}
                            max={600}
                            step={30}
                        />
                        <Text variant="bodySmall" style={styles.description}>
                            Total audio buffer size
                        </Text>
                    </View>
                    
                    <View style={styles.optionContainer}>
                        <NumberAdjuster
                            label="Slice Size (seconds)"
                            value={settings.realtimeOptions.realtimeAudioSliceSec ?? 30}
                            onChange={(value) => handleRealtimeChange('realtimeAudioSliceSec', value)}
                            min={5}
                            max={60}
                            step={5}
                        />
                        <Text variant="bodySmall" style={styles.description}>
                            Size of audio chunks for processing
                        </Text>
                    </View>
                </>
            )}

            {/* Batch Options */}
            {(settings.mode === 'batch' || isWeb) && (
                <>
                    <View style={styles.sectionHeader}>
                        <Text variant="titleMedium">Batch Settings</Text>
                    </View>
                    
                    <View style={styles.optionContainer}>
                        <NumberAdjuster
                            label="Batch Interval (seconds)"
                            value={settings.batchOptions.batchIntervalSec ?? (isWeb ? 3 : 5)}
                            onChange={(value) => handleBatchChange('batchIntervalSec', value)}
                            min={1}
                            max={30}
                            step={1}
                        />
                        <Text variant="bodySmall" style={styles.description}>
                            How often to run transcription
                        </Text>
                    </View>
                    
                    <View style={styles.optionContainer}>
                        <NumberAdjuster
                            label="Window Size (seconds)"
                            value={settings.batchOptions.batchWindowSec ?? 30}
                            onChange={(value) => handleBatchChange('batchWindowSec', value)}
                            min={5}
                            max={120}
                            step={5}
                        />
                        <Text variant="bodySmall" style={styles.description}>
                            Size of audio window to process
                        </Text>
                    </View>
                    
                    <View style={styles.optionContainer}>
                        <NumberAdjuster
                            label="Min New Data (seconds)"
                            value={settings.batchOptions.minNewDataSec ?? (isWeb ? 0.5 : 1)}
                            onChange={(value) => handleBatchChange('minNewDataSec', value)}
                            min={0.1}
                            max={10}
                            step={0.1}
                        />
                        <Text variant="bodySmall" style={styles.description}>
                            Minimum new data required before processing
                        </Text>
                    </View>
                    
                    <View style={styles.optionContainer}>
                        <NumberAdjuster
                            label="Max Buffer (seconds)"
                            value={settings.batchOptions.maxBufferLengthSec ?? 60}
                            onChange={(value) => handleBatchChange('maxBufferLengthSec', value)}
                            min={15}
                            max={300}
                            step={15}
                        />
                        <Text variant="bodySmall" style={styles.description}>
                            Maximum length of audio buffer to retain
                        </Text>
                    </View>
                </>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
        padding: 16,
    },
    sectionHeader: {
        marginTop: 8,
        marginBottom: 8,
    },
    segmentedButtonContainer: {
        width: '100%',
        marginBottom: 8,
    },
    description: {
        marginTop: 4,
        opacity: 0.7,
    },
    optionContainer: {
        marginBottom: 16,
    }
}) 