// playground/src/component/audio-recording-config/audio-recording-config-form.tsx
import { Button, LabelSwitch } from '@siteed/design-system'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { SegmentedButtons } from 'react-native-paper'

import { TranscriptionState } from '../context/TranscriptionProvider.types'

const getStyles = () => {
    return StyleSheet.create({
        container: {
            gap: 5,
            padding: 20,
        },
        actionContainer: {
            flexDirection: 'row',
            gap: 20,
        },
        topActionsContainer: {
            gap: 5,
            marginBottom: 20,
        },
        actionButton: {
            flex: 1,
        },
        labelContainerStyle: {
            margin: 0,
        },
        segmentedButton: {
            padding: 0,
            margin: 0,
        },
    })
}

export type SelectedTranscriptionProps = Pick<
    TranscriptionState,
    'model' | 'language' | 'quantized' | 'multilingual'
>

export interface TranscriptionConfigFormProps {
    config: SelectedTranscriptionProps
    onChange?: (config: SelectedTranscriptionProps) => void
}

export const TranscriptionConfigForm = ({
    config,
    onChange,
}: TranscriptionConfigFormProps) => {
    const styles = useMemo(() => getStyles(), [])

    const [tempConfig, setTempConfig] = useState<SelectedTranscriptionProps>({
        ...config,
    })

    useEffect(() => {
        setTempConfig({ ...config })
    }, [config])

    const handleChange = useCallback(
        (key: keyof SelectedTranscriptionProps, value: string | boolean) => {
            setTempConfig((prevConfig) => {
                const newConfig = { ...prevConfig, [key]: value }
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
            <View style={styles.topActionsContainer}>
                <SegmentedButtons
                    value={tempConfig.model}
                    onValueChange={(value) => handleChange('model', value)}
                    buttons={[
                        {
                            value: 'Xenova/whisper-tiny',
                            label: 'Tiny',
                        },
                        {
                            value: 'Xenova/whisper-medium',
                            label: 'Medium',
                        },
                        {
                            value: 'Xenova/whisper-large-v2',
                            label: 'Large-v3',
                        },
                    ]}
                    style={styles.segmentedButton}
                />
                <LabelSwitch
                    label="Quantized"
                    value={tempConfig.quantized}
                    onValueChange={(value) => handleChange('quantized', value)}
                />
                <LabelSwitch
                    label="Multilingual"
                    value={tempConfig.multilingual}
                    onValueChange={(value) =>
                        handleChange('multilingual', value)
                    }
                />
            </View>
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
