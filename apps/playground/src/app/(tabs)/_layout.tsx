// playground/src/app/(tabs)/_layout.tsx
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useTheme } from '@siteed/design-system'
import { useSharedAudioRecorder } from '@siteed/expo-audio-stream'
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
                            }}
                        >
                            Record
                        </Text>
                    ),
                    tabBarIcon: ({ color }) => (
                        <MaterialCommunityIcons
                            name="record-circle"
                            size={24}
                            color={isRecording ? recordingColor : color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="play"
                options={{
                    title: 'Play',
                    href: 'play',
                    tabBarIcon: ({ color }) => (
                        <FontAwesome size={28} name="play" color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="extract"
                options={{
                    title: 'Extract',
                    // href: 'extract',
                    href: null, // hide it for now
                    tabBarIcon: ({ color }) => (
                        <MaterialCommunityIcons
                            name="file-music"
                            size={24}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="preview"
                options={{
                    title: 'Preview',
                    href: __DEV__ ? 'preview' : null,
                    tabBarIcon: ({ color }) => (
                        <MaterialCommunityIcons
                            name="waveform"
                            size={24}
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
                        <FontAwesome size={28} name="cog" color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="more"
                options={{
                    title: 'More',
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons
                            name="more-horiz"
                            size={28}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    )
}
