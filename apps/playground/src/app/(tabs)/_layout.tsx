// playground/src/app/(tabs)/_layout.tsx
import React from 'react'

import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { Text } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '@siteed/design-system'
import { useSharedAudioRecorder } from '@siteed/expo-audio-studio'

import { isWeb } from '../../utils/utils'

const recordingColor = 'rgba(255, 99, 71, 1)'

export default function TabLayout() {
    const { isRecording } = useSharedAudioRecorder()
    const { colors } = useTheme()
    const insets = useSafeAreaInsets()

    return (
        <Tabs 
            screenOptions={{
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.text,
                tabBarStyle: {
                    backgroundColor: colors.background,
                    borderTopColor: colors.border,
                    paddingBottom: insets.bottom, // Add padding for bottom safe area
                },
                headerStyle: {
                    backgroundColor: colors.background,
                },
                headerTintColor: colors.text,
            }}
            initialRouteName="record"
        >
            <Tabs.Screen
                name="record"
                options={{
                    title: 'Record',
                    tabBarLabel: ({ color, position }) => (
                        <Text
                            testID="record-tab-label"
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
                    tabBarIcon: ({ color }) => (
                        <MaterialCommunityIcons
                            name="microphone-message"
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
            {__DEV__ && (
                <Tabs.Screen
                    name="agent-validation"
                    options={{
                        title: 'Agent Tests',
                        tabBarIcon: ({ color }) => (
                            <MaterialCommunityIcons 
                                name="robot" 
                                size={28} 
                                color={color} 
                            />
                        ),
                        tabBarStyle: {
                            backgroundColor: colors.error, // Red background to indicate dev-only
                            borderTopColor: colors.border,
                            paddingBottom: insets.bottom,
                        },
                        tabBarActiveTintColor: '#fff',
                        tabBarInactiveTintColor: 'rgba(255,255,255,0.8)',
                    }}
                />
            )}
        </Tabs>
    )
}
