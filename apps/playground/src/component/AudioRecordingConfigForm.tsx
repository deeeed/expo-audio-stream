// playground/src/component/audio-recording-config/audio-recording-config-form.tsx
import { LabelSwitch, NumberAdjuster } from '@siteed/design-system'
import { AudioVisualizerProps } from '@siteed/expo-audio-ui'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'

const getStyles = () => {
    return StyleSheet.create({
        container: {
            gap: 10,
            padding: 20,
        },
        labelContainerStyle: {
            margin: 0,
        },
    })
}

export type SelectedAudioVisualizerProps = Pick<
    AudioVisualizerProps,
    | 'candleSpace'
    | 'candleWidth'
    | 'canvasHeight'
    | 'showDottedLine'
    | 'showSilence'
    | 'showRuler'
>

export interface AudioRecordingConfigFormProps {
    config: SelectedAudioVisualizerProps
    onChange?: (config: SelectedAudioVisualizerProps) => void
}

export const AudioRecordingConfigForm = ({
    config,
    onChange,
}: AudioRecordingConfigFormProps) => {
    const styles = useMemo(() => getStyles(), [])

    const [tempConfig, setTempConfig] = useState<SelectedAudioVisualizerProps>({
        ...config,
    })

    useEffect(() => {
        setTempConfig({ ...config })
    }, [config])

    const handleChange = useCallback(
        (key: keyof SelectedAudioVisualizerProps, value: number | boolean) => {
            setTempConfig((prevConfig) => {
                const newConfig = { ...prevConfig, [key]: value }
                // Defer the state update to avoid updating state during render
                setTimeout(() => {
                    onChange?.(newConfig)
                }, 0)
                return newConfig
            })
        },
        [onChange]
    )

    return (
        <View style={styles.container}>
            <LabelSwitch
                label="Show Silence"
                onValueChange={(value) => {
                    handleChange('showSilence', value)
                }}
                value={tempConfig.showSilence ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="Show Ruler"
                onValueChange={(value) => {
                    handleChange('showRuler', value)
                }}
                value={tempConfig.showRuler ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="Show Dotted Line"
                onValueChange={(value) => {
                    handleChange('showDottedLine', value)
                }}
                value={tempConfig.showDottedLine ?? true}
                containerStyle={styles.labelContainerStyle}
            />
            <NumberAdjuster
                label="Candle Space"
                value={tempConfig.candleSpace ?? 1}
                onChange={(value) => handleChange('candleSpace', value)}
                min={1}
                max={100}
                step={1}
            />
            <NumberAdjuster
                label="Candle Width"
                value={tempConfig.candleWidth ?? 1}
                onChange={(value) => handleChange('candleWidth', value)}
                min={1}
                max={100}
                step={1}
            />
            <NumberAdjuster
                label="Canvas Height"
                value={tempConfig.canvasHeight ?? 1}
                onChange={(value) => handleChange('canvasHeight', value)}
                min={1}
                max={1000}
                step={10}
            />
        </View>
    )
}
