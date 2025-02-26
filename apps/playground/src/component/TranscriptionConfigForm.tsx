// playground/src/component/audio-recording-config/audio-recording-config-form.tsx
import { AppTheme, LabelSwitch, useThemePreferences } from '@siteed/design-system'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { Button, RadioButton, SegmentedButtons, Text } from 'react-native-paper'

import { config } from '../config'
import { TranscriptionState } from '../context/TranscriptionProvider.types'
import { WEB_WHISPER_MODELS, WHISPER_MODELS } from '../hooks/useWhisperModels'

// Use a subset of TranscriptionState for the form
export type TranscriptionConfigFormState = Pick<
  TranscriptionState,
  'model' | 'multilingual' | 'quantized' | 'language' | 'tdrz' | 'subtask'
>

interface TranscriptionConfigFormProps {
    config: TranscriptionConfigFormState
    onChange: (config: TranscriptionConfigFormState) => void
}

const getStyles = ({ theme }: { theme: AppTheme }) => {
    return StyleSheet.create({
        container: {
            gap: theme.spacing.gap,
            padding: theme.padding.s,
            paddingVertical: 16,
        },
        formField: {
            marginBottom: theme.margin.s,
        },
        label: {
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: theme.margin.s,
            color: theme.colors.text,
        },
        radioOption: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        switchContainer: {
            backgroundColor: theme.colors.surface,
        },
        segmentedButtonContainer: {
        }
    })
}

export const TranscriptionConfigForm: React.FC<TranscriptionConfigFormProps> = ({
    config: initialConfig,
    onChange,
}) => {
    const { theme } = useThemePreferences()
    const styles = useMemo(() => getStyles({ theme }), [theme])
    const [selectedConfig, setSelectedConfig] = useState<TranscriptionConfigFormState>(initialConfig)
    
    // Get the current model's capabilities
    const modelCapabilities = useMemo(() => {
        return config.getModelCapabilities(selectedConfig.model)
    }, [selectedConfig.model])
    
    // Update config when model changes to respect capabilities
    useEffect(() => {
        // If current model doesn't support multilingual but it's enabled, disable it
        if (!modelCapabilities.multilingual && selectedConfig.multilingual) {
            setSelectedConfig(prev => ({
                ...prev,
                multilingual: false,
                // Clear language if multilingual is disabled
                language: undefined
            }))
        }
        
        // If current model doesn't support quantization but it's enabled, disable it
        if (!modelCapabilities.quantizable && selectedConfig.quantized) {
            setSelectedConfig(prev => ({
                ...prev,
                quantized: false
            }))
        }
        
        // For native only: handle TDRZ option
        if (Platform.OS !== 'web') {
            const hasTdrz = 'tdrz' in modelCapabilities && modelCapabilities.tdrz === true
            if (!hasTdrz && selectedConfig.tdrz) {
                setSelectedConfig(prev => ({
                    ...prev,
                    tdrz: false
                }))
            }
        }
    }, [
        selectedConfig.model, 
        modelCapabilities, 
        selectedConfig.multilingual, 
        selectedConfig.quantized, 
        selectedConfig.tdrz
    ])
    
    const handleChange = useCallback(<K extends keyof TranscriptionConfigFormState>(
        key: K, 
        value: TranscriptionConfigFormState[K]
    ) => {
        setSelectedConfig(prev => ({
            ...prev,
            [key]: value
        }))
    }, [])
    
    const handleSubmit = useCallback(() => {
        onChange(selectedConfig)
    }, [selectedConfig, onChange])
    
    // Get model options based on platform
    const modelOptions = useMemo(() => {
        const models = Platform.OS === 'web' ? WEB_WHISPER_MODELS : WHISPER_MODELS
        return models.map(model => ({
            label: model.label,
            value: model.id
        }))
    }, [])
    
    // Language options (only shown if multilingual is enabled)
    const languageOptions = useMemo(() => [
        { label: 'Auto Detect', value: 'auto' },
        { label: 'English', value: 'english' },
        { label: 'Spanish', value: 'spanish' },
        { label: 'French', value: 'french' },
        { label: 'Chinese', value: 'chinese' },
    ], [])
    
    return (
        <View style={styles.container}>
            <View style={styles.formField}>
                <SegmentedButtons
                    value={selectedConfig.model}
                    onValueChange={(value) => handleChange('model', value)}
                    buttons={modelOptions}
                    style={styles.segmentedButtonContainer}
                />
            </View>
            
            {modelCapabilities.quantizable && (
                <LabelSwitch
                    label="Quantized"
                    value={selectedConfig.quantized}
                    onValueChange={(value: boolean) => handleChange('quantized', value)}
                    containerStyle={styles.switchContainer}
                />
            )}
            
            {modelCapabilities.multilingual && (
                <>
                    <LabelSwitch
                        label="Multilingual"
                        value={selectedConfig.multilingual}
                        onValueChange={(value: boolean) => handleChange('multilingual', value)}
                        containerStyle={styles.switchContainer}
                    />
                    
                    {selectedConfig.multilingual && (
                        <View style={styles.formField}>
                            <Text style={styles.label}>Language</Text>
                            <RadioButton.Group
                                value={selectedConfig.language || 'auto'}
                                onValueChange={(value: string) => handleChange('language', value)}
                            >
                                {languageOptions.map(option => (
                                    <View key={option.value} style={styles.radioOption}>
                                        <RadioButton value={option.value} />
                                        <Text style={{ color: theme.colors.text }}>{option.label}</Text>
                                    </View>
                                ))}
                            </RadioButton.Group>
                        </View>
                    )}
                </>
            )}
            
            {/* TDRZ option for native only */}
            {Platform.OS !== 'web' && 
             'tdrz' in modelCapabilities && 
             modelCapabilities.tdrz === true && (
                <LabelSwitch
                    label="TDRZ (Timestamp Distillation)"
                    value={selectedConfig.tdrz || false}
                    onValueChange={(value: boolean) => handleChange('tdrz', value)}
                    containerStyle={styles.switchContainer}
                />
            )}
            
            <Button 
                mode="contained" 
                onPress={handleSubmit}
                buttonColor={theme.colors.primary}
                textColor={theme.colors.onPrimary}
            >
                Apply Configuration
            </Button>
        </View>
    )
}
