import { AppTheme, EditableInfoCard, LabelSwitch, Notice, useModal, useTheme } from '@siteed/design-system'
import { getLogger } from '@siteed/react-native-logger'
import React, { useCallback, useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
    BatchTranscriptionOptions,
    RealtimeTranscriptionOptions
} from '../hooks/useUnifiedTranscription'

import { TranscriptionModeConfigForm } from './TranscriptionModeConfigForm'

const logger = getLogger('TranscriptionModeConfig')

export interface TranscriptionModeSettings {
    mode: 'realtime' | 'batch';
    realtimeOptions: RealtimeTranscriptionOptions;
    batchOptions: BatchTranscriptionOptions;
}

interface TranscriptionModeConfigProps {
    enabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
    settings: TranscriptionModeSettings;
    onSettingsChange: (settings: TranscriptionModeSettings) => void;
    validSampleRate: boolean;
    isWeb?: boolean;
}

export const TranscriptionModeConfig = ({
    enabled,
    onEnabledChange,
    settings,
    onSettingsChange,
    validSampleRate,
    isWeb = false
}: TranscriptionModeConfigProps) => {
    const { openDrawer } = useModal()
    const theme = useTheme()
    const styles = useMemo(() => getStyles({ theme }), [theme])

    const handleEditConfig = useCallback(async () => {
        try {
            const result = await openDrawer({
                initialData: settings,
                containerType: 'scrollview',
                title: 'Transcription Settings',
                footerType: 'confirm_cancel',
                render: ({ state, onChange }) => {
                    // Create a debounced version of onChange to prevent update loops
                    const debouncedOnChange = (data: TranscriptionModeSettings) => {
                        // Only update if the data has actually changed
                        if (JSON.stringify(data) !== JSON.stringify(state.data)) {
                            onChange(data);
                        }
                    };
                    
                    return (
                        <TranscriptionModeConfigForm
                            settings={state.data}
                            onSettingsChange={debouncedOnChange}
                            isWeb={isWeb}
                        />
                    );
                },
            });

            if (result && JSON.stringify(result) !== JSON.stringify(settings)) {
                logger.debug(`New transcription settings`, result);
                onSettingsChange(result);
            }
        } catch (error) {
            logger.error(`Failed to change transcription settings`, error);
        }
    }, [openDrawer, settings, isWeb, onSettingsChange]);

    const renderConfigValue = useCallback(() => {
        if (!enabled || !validSampleRate) {
            return <Text style={styles.configValue}>Disabled</Text>
        }

        return (
            <View>
                <View style={styles.configItem}>
                    <Text style={styles.configLabel}>Mode:</Text>
                    <Text style={styles.configValue}>
                        {settings.mode === 'realtime' ? 'Realtime' : 'Batch'}
                    </Text>
                </View>
                
                {settings.mode === 'realtime' && !isWeb && (
                    <>
                        <View style={styles.configSection}>
                            <Text style={styles.configLabel}>Realtime Settings:</Text>
                            <View style={styles.configItem}>
                                <Text style={styles.configValue}>
                                    Min: {settings.realtimeOptions.realtimeAudioMinSec}s, 
                                    Buffer: {settings.realtimeOptions.realtimeAudioSec}s, 
                                    Slice: {settings.realtimeOptions.realtimeAudioSliceSec}s
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.modeDescription}>
                            Realtime mode provides continuous transcription with minimal delay.
                        </Text>
                    </>
                )}
                
                {(settings.mode === 'batch' || isWeb) && (
                    <>
                        <View style={styles.configSection}>
                            <Text style={styles.configLabel}>Batch Settings:</Text>
                            <View style={styles.configItem}>
                                <Text style={styles.configValue}>
                                    Interval: {settings.batchOptions.batchIntervalSec}s, 
                                    Window: {settings.batchOptions.batchWindowSec}s
                                </Text>
                            </View>
                            <View style={styles.configItem}>
                                <Text style={styles.configValue}>
                                    Min Data: {settings.batchOptions.minNewDataSec}s, 
                                    Max Buffer: {settings.batchOptions.maxBufferLengthSec}s
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.modeDescription}>
                            Batch mode analyzes audio every {settings.batchOptions.batchIntervalSec} seconds rather than continuously.
                            {isWeb ? ' This is the only mode available on web.' : ''}
                        </Text>
                    </>
                )}
            </View>
        )
    }, [enabled, validSampleRate, settings, isWeb, styles])

    return (
        <View style={styles.container}>
            <LabelSwitch
                label="Live Transcription"
                value={validSampleRate && enabled}
                disabled={!validSampleRate}
                onValueChange={onEnabledChange}
            />
            
            {validSampleRate && enabled && (
                <>
                    <EditableInfoCard
                        label="Transcription Settings"
                        value={settings.mode === 'realtime' ? 'Realtime' : 'Batch'}
                        containerStyle={{ 
                            margin: 0,
                            backgroundColor: theme.colors.surface,
                        }}
                        renderValue={renderConfigValue}
                        editable={true}
                        onEdit={handleEditConfig}
                    />
                    
                    <View style={styles.infoContainer}>
                        <Text style={styles.infoText}>
                            {settings.mode === 'realtime' && !isWeb ? 
                                'Realtime mode processes audio continuously for immediate transcription.' : 
                                'Batch mode collects audio for a few seconds before processing, which may show results with slight delay but uses less resources.'}
                        </Text>
                    </View>
                </>
            )}
            
            {!validSampleRate && (
                <Notice
                    type="warning"
                    title="Transcription Not Available"
                    message="Live Transcription is only available at 16kHz sample rate"
                />
            )}
        </View>
    )
}

const getStyles = ({ theme }: { theme: AppTheme }) => {
    return StyleSheet.create({
        container: {
            gap: 8,
        },
        configItem: {
            marginBottom: 4,
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
        },
        configLabel: {
            fontWeight: 'bold',
            color: theme.colors.primary,
            marginRight: 4,
        },
        configValue: {
            color: theme.colors.onSurface,
        },
        configSection: {
            marginTop: 8,
            paddingLeft: 8,
            borderLeftWidth: 2,
            borderLeftColor: theme.colors.primaryContainer,
        },
        errorText: {
            color: theme.colors.error,
            fontSize: 14,
            marginTop: 4,
        },
        modeDescription: {
            fontSize: 13,
            color: theme.colors.onSurfaceVariant,
            marginTop: 4,
            fontStyle: 'italic',
        },
        infoContainer: {
            backgroundColor: theme.colors.surfaceVariant,
            padding: 12,
            borderRadius: 8,
            marginTop: 8,
        },
        infoText: {
            fontSize: 14,
            color: theme.colors.onSurfaceVariant,
        }
    })
} 