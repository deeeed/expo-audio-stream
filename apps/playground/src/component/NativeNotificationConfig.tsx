import {
    EditableInfoCard,
    LabelSwitch,
    useModal,
    useTheme,
} from '@siteed/design-system'
import { NotificationConfig } from '@siteed/expo-audio-stream'
import { getLogger } from '@siteed/react-native-logger'
import React from 'react'
import { Platform, StyleSheet, View } from 'react-native'

import { NotificationConfigForm } from './NotificationConfigForm'

const logger = getLogger('NativeNotificationConfig')

interface NativeNotificationConfigProps {
    enabled: boolean
    onEnabledChange: (enabled: boolean) => void
    config: NotificationConfig
    onConfigChange: (config: NotificationConfig) => void
}

export const NativeNotificationConfig = ({
    enabled,
    onEnabledChange,
    config,
    onConfigChange,
}: NativeNotificationConfigProps) => {
    const { openDrawer } = useModal()
    const theme = useTheme()

    const handleEditConfig = async () => {
        try {
            const newConfig = await openDrawer({
                initialData: config,
                title: 'Native Notifications',
                footerType: 'confirm_cancel',
                render: ({ data, onChange }) => (
                    <NotificationConfigForm
                        config={data}
                        onConfigChange={(newConfig) => {
                            onChange(newConfig)
                        }}
                    />
                ),
            })

            if (!newConfig) {
                // canceled
                return
            }

            logger.debug(`new config `, newConfig)
            onConfigChange(newConfig)
        } catch (error) {
            logger.error(`Failed to change config`, error)
        }
    }

    // Only show on native platforms
    if (Platform.OS === 'web') {
        return null
    }

    return (
        <View style={styles.container}>
            <LabelSwitch
                label="Show Notification"
                value={enabled}
                onValueChange={onEnabledChange}
            />

            {enabled && (
                <EditableInfoCard
                    label="Notification Config"
                    value={JSON.stringify(config, null, 2)}
                    containerStyle={{
                        margin: 0,
                        backgroundColor: theme.colors.surface,
                    }}
                    editable
                    onEdit={handleEditConfig}
                />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
})
