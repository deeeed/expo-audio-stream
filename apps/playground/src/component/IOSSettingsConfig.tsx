import { EditableInfoCard, useModal } from '@siteed/design-system'
import { RecordingConfig } from '@siteed/expo-audio-stream'
import { getLogger } from '@siteed/react-native-logger'
import React, { useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'

import { IOSSettingsConfigForm } from './IOSSettingsConfigForm'

const logger = getLogger('IOSSettingsConfig')

interface IOSSettingsConfigProps {
    config?: RecordingConfig['ios']
    onConfigChange: (config: RecordingConfig['ios']) => void
}

export const IOSSettingsConfig = ({
    config,
    onConfigChange,
}: IOSSettingsConfigProps) => {
    const { openDrawer } = useModal()
    const [localConfig, setLocalConfig] = useState(config)

    const handleEditConfig = async () => {
        try {
            const result = await openDrawer({
                initialData: localConfig ?? { audioSession: {} },
                containerType: 'scrollview',
                title: 'iOS Audio Settings',
                footerType: 'confirm_cancel',
                render: ({ state, onChange }) => (
                    <IOSSettingsConfigForm
                        config={state.data}
                        onConfigChange={(newConfig) => {
                            onChange(newConfig)
                            setLocalConfig(newConfig)
                        }}
                    />
                ),
            })

            if (result) {
                logger.debug(`New iOS config`, result)
                onConfigChange(result)
            }
        } catch (error) {
            logger.error(`Failed to change iOS config`, error)
        }
    }

    // Only show on iOS
    if (Platform.OS !== 'ios') {
        return null
    }

    return (
        <View style={styles.container}>
            <EditableInfoCard
                label="iOS Audio Settings"
                value={JSON.stringify(localConfig?.audioSession ?? {}, null, 2)}
                containerStyle={{ margin: 0 }}
                editable
                onEdit={handleEditConfig}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
})
