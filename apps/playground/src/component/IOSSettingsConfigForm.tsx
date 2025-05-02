import React, { useCallback, useState } from 'react'

import { StyleSheet, View } from 'react-native'

import type { SelectOption } from '@siteed/design-system'
import { Picker } from '@siteed/design-system'
import type { IOSConfig, AudioSessionConfig } from '@siteed/expo-audio-studio'
import { getLogger } from '@siteed/react-native-logger'

const logger = getLogger('IOSSettingsConfigForm')

interface IOSSettingsConfigFormProps {
    config: IOSConfig
    onConfigChange: (config: IOSConfig) => void
}

export const IOSSettingsConfigForm = ({
    config = {
        audioSession: {
            category: undefined,
            mode: undefined,
            categoryOptions: undefined,
        },
    },
    onConfigChange,
}: IOSSettingsConfigFormProps) => {
    const [localConfig, setLocalConfig] = useState(config)

    const handleCategoryFinish = useCallback(
        (selectedOptions: SelectOption[]) => {
            const selected = selectedOptions.find((option) => option.selected)
            if (!selected) return

            const newConfig = {
                ...localConfig,
                audioSession: {
                    ...localConfig.audioSession,
                    category: selected.value as AudioSessionConfig['category'],
                },
            }
            logger.debug('Updating category config:', newConfig)
            setLocalConfig(newConfig)
            onConfigChange(newConfig)
        },
        [localConfig, onConfigChange]
    )

    const handleModeFinish = useCallback(
        (selectedOptions: SelectOption[]) => {
            const selected = selectedOptions.find((option) => option.selected)
            if (!selected) return

            const newConfig = {
                ...localConfig,
                audioSession: {
                    ...localConfig.audioSession,
                    mode: selected.value as AudioSessionConfig['mode'],
                },
            }
            logger.debug('Updating mode config:', newConfig)
            setLocalConfig(newConfig)
            onConfigChange(newConfig)
        },
        [localConfig, onConfigChange]
    )

    const handleOptionsFinish = useCallback(
        (selectedOptions: SelectOption[]) => {
            const selectedValues = selectedOptions
                .filter((option) => option.selected)
                .map((option) => option.value) as NonNullable<
                AudioSessionConfig['categoryOptions']
            >

            const newConfig = {
                ...localConfig,
                audioSession: {
                    ...localConfig.audioSession,
                    categoryOptions: selectedValues,
                },
            }
            logger.debug('Updating options config:', newConfig)
            setLocalConfig(newConfig)
            onConfigChange(newConfig)
        },
        [localConfig, onConfigChange]
    )

    return (
        <View style={styles.container}>
            <Picker
                label="Audio Category"
                multi={false}
                options={categories.map(
                    (category): SelectOption => ({
                        label: category,
                        value: category,
                        selected:
                            localConfig.audioSession?.category === category,
                    })
                )}
                onFinish={handleCategoryFinish}
            />

            <Picker
                label="Audio Mode"
                multi={false}
                options={modes.map(
                    (mode): SelectOption => ({
                        label: mode,
                        value: mode,
                        selected: localConfig.audioSession?.mode === mode,
                    })
                )}
                onFinish={handleModeFinish}
            />

            <Picker
                label="Category Options"
                multi
                options={categoryOptions.map(
                    (option): SelectOption => ({
                        label: option,
                        value: option,
                        selected: Boolean(
                            localConfig.audioSession?.categoryOptions?.includes(
                                option
                            )
                        ),
                    })
                )}
                onFinish={handleOptionsFinish}
            />
        </View>
    )
}

const categoryOptions: NonNullable<
    AudioSessionConfig['categoryOptions']
>[number][] = [
    'MixWithOthers',
    'DuckOthers',
    'InterruptSpokenAudioAndMixWithOthers',
    'AllowBluetooth',
    'AllowBluetoothA2DP',
    'AllowAirPlay',
    'DefaultToSpeaker',
]

const categories: NonNullable<AudioSessionConfig['category']>[] = [
    'Ambient',
    'SoloAmbient',
    'Playback',
    'Record',
    'PlayAndRecord',
    'MultiRoute',
]

const modes: NonNullable<AudioSessionConfig['mode']>[] = [
    'Default',
    'VoiceChat',
    'VideoChat',
    'GameChat',
    'VideoRecording',
    'Measurement',
    'MoviePlayback',
    'SpokenAudio',
]

const styles = StyleSheet.create({
    container: {
        gap: 16,
        padding: 16,
    },
})
