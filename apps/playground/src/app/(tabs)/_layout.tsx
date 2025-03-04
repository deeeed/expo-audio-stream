// playground/src/app/(tabs)/_layout.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '@siteed/design-system'
import { useSharedAudioRecorder } from '@siteed/expo-audio-studio'
import { Tabs } from 'expo-router'
import React from 'react'
import { Text } from 'react-native-paper'

import { isWeb } from '../../utils/utils'

const recordingColor = 'rgba(255, 99, 71, 1)'

export default function TabLayout() {
    const { isRecording } = useSharedAudioRecorder()
    const { colors } = useTheme()

    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary }}>
            <Tabs.Screen
                name="index"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="record"
                options={{
                    title: 'Record',
                    tabBarLabel: ({ color, position }) => (
                        <Text
                            style={{
                                color: isRecording ? recordingColor : color,
                                paddingLeft:
                                    isWeb && position === 'beside-icon'
                                        ? 20
                                        : 0,
                                fontSize: 12,
                            }}
                        >
                            Record
                        </Text>
                    ),
                    tabBarIcon: ({ color }) => (
                        <MaterialCommunityIcons
                            name="record-circle"
                            size={26}
                            color={isRecording ? recordingColor : color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="import"
                options={{
                    title: 'Import',
                    href: 'import',
                    tabBarIcon: ({ color }) => (
                        <MaterialCommunityIcons
                            name="file-upload"
                            size={28}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="transcription"
                options={{
                    title: 'Transcription',
                    href: 'transcription',
                    tabBarIcon: ({ color }) => (
                        <MaterialCommunityIcons
                            name="text-to-speech"
                            size={28}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="files"
                options={{
                    title: 'Files',
                    href: 'files',
                    tabBarIcon: ({ color }) => (
                        <MaterialCommunityIcons
                            name="cog"
                            size={28}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="more"
                options={{
                    title: 'More',
                    tabBarIcon: ({ color }) => (
                        <MaterialCommunityIcons
                            name="dots-horizontal"
                            size={28}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    )
}
