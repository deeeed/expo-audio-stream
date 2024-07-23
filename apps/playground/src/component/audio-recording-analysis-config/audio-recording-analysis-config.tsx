import { Button, LabelSwitch, NumberAdjuster } from '@siteed/design-system'
import {
    AudioFeaturesOptions,
    RecordingConfig,
} from '@siteed/expo-audio-stream'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'

const getStyles = () => {
    return StyleSheet.create({
        container: {
            padding: 20,
        },
        actionContainer: {
            flexDirection: 'row',
            marginTop: 20,
            gap: 20,
        },
        actionButton: {
            flex: 1,
        },
        labelContainerStyle: {
            margin: 0,
        },
    })
}

export interface SelectedAnalysisConfig {
    pointsPerSecond: RecordingConfig['pointsPerSecond']
    skipWavHeader: boolean
    features: AudioFeaturesOptions
}

export interface AudioRecordingAnalysisConfigProps {
    config: SelectedAnalysisConfig
    onChange?: (config: SelectedAnalysisConfig) => void
}

export const AudioRecordingAnalysisConfig = ({
    config,
    onChange,
}: AudioRecordingAnalysisConfigProps) => {
    const styles = useMemo(() => getStyles(), [])

    const [tempConfig, setTempConfig] = useState<SelectedAnalysisConfig>({
        ...config,
    })

    useEffect(() => {
        setTempConfig({ ...config })
    }, [config])

    const handleChange = useCallback(
        (key: keyof SelectedAnalysisConfig, value: number | boolean) => {
            setTempConfig((prevConfig) => {
                const newConfig = { ...prevConfig, [key]: value }
                return newConfig
            })
        },
        [onChange]
    )

    const handleFeatureChange = useCallback(
        (feature: keyof AudioFeaturesOptions, value: boolean) => {
            setTempConfig((prevConfig) => {
                const newConfig = {
                    ...prevConfig,
                    features: { ...prevConfig.features, [feature]: value },
                }
                return newConfig
            })
        },
        [onChange]
    )

    const handleSave = useCallback(() => {
        onChange?.(tempConfig)
    }, [tempConfig, onChange])

    const handleCancel = useCallback(() => {
        setTempConfig({ ...config })
        onChange?.(config)
    }, [config])

    return (
        <View style={styles.container}>
            <LabelSwitch
                label="Skip Wav Header"
                onValueChange={(value) => {
                    handleChange('skipWavHeader', value)
                }}
                value={tempConfig.skipWavHeader ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <NumberAdjuster
                label="Points Per Second"
                value={tempConfig.pointsPerSecond ?? 20}
                onChange={(value) => handleChange('pointsPerSecond', value)}
                min={0.1}
                max={1000}
                step={1}
            />
            <LabelSwitch
                label="mfcc"
                onValueChange={(value) => {
                    handleFeatureChange('mfcc', value)
                }}
                value={tempConfig.features.mfcc ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="Energy"
                onValueChange={(value) => {
                    handleFeatureChange('energy', value)
                }}
                value={tempConfig.features.energy ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="Zero Crossing Rate"
                onValueChange={(value) => {
                    handleFeatureChange('zcr', value)
                }}
                value={tempConfig.features.zcr ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="Spectral Centroid"
                onValueChange={(value) => {
                    handleFeatureChange('spectralCentroid', value)
                }}
                value={tempConfig.features.spectralCentroid ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="Spectral Flatness"
                onValueChange={(value) => {
                    handleFeatureChange('spectralFlatness', value)
                }}
                value={tempConfig.features.spectralFlatness ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="spectral Rolloff"
                onValueChange={(value) => {
                    handleFeatureChange('spectralRolloff', value)
                }}
                value={tempConfig.features.spectralRolloff ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="spectral Bandwidth"
                onValueChange={(value) => {
                    handleFeatureChange('spectralBandwidth', value)
                }}
                value={tempConfig.features.spectralBandwidth ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="chromagram"
                onValueChange={(value) => {
                    handleFeatureChange('chromagram', value)
                }}
                value={tempConfig.features.chromagram ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="tempo"
                onValueChange={(value) => {
                    handleFeatureChange('tempo', value)
                }}
                value={tempConfig.features.tempo ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="hnr"
                onValueChange={(value) => {
                    handleFeatureChange('hnr', value)
                }}
                value={tempConfig.features.hnr ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <View style={styles.actionContainer}>
                <Button
                    onPress={handleCancel}
                    mode="outlined"
                    style={styles.actionButton}
                >
                    Cancel
                </Button>
                <Button
                    onPress={handleSave}
                    mode="contained"
                    style={styles.actionButton}
                >
                    Save
                </Button>
            </View>
        </View>
    )
}
