// playground/src/app/(tabs)/_layout.tsx
import React from 'react'
import { Platform } from 'react-native'

import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { NativeTabs } from 'expo-router/unstable-native-tabs'

import { useTheme } from '@siteed/design-system'
import { useSharedAudioRecorder } from '@siteed/expo-audio-studio'

const recordingColor = 'rgba(255, 99, 71, 1)'

export default function TabLayout() {
    const { isRecording } = useSharedAudioRecorder()
    const { colors } = useTheme()

    if (Platform.OS === 'web') {
        return (
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: colors.primary,
                    tabBarInactiveTintColor: colors.text,
                    tabBarStyle: {
                        backgroundColor: colors.background,
                        borderTopColor: colors.border,
                    },
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                }}
                initialRouteName="record"
            >
                <Tabs.Screen
                    name="record"
                    options={{
                        title: 'Record',
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
                            <MaterialCommunityIcons name="file-upload" size={28} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="transcription"
                    options={{
                        title: 'Transcription',
                        tabBarIcon: ({ color }) => (
                            <MaterialCommunityIcons name="microphone-message" size={28} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="files"
                    options={{
                        title: 'Files',
                        tabBarIcon: ({ color }) => (
                            <MaterialCommunityIcons name="cog" size={28} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="more"
                    options={{
                        title: 'More',
                        tabBarIcon: ({ color }) => (
                            <MaterialCommunityIcons name="dots-horizontal" size={28} color={color} />
                        ),
                    }}
                />
            </Tabs>
        )
    }

    return (
        <NativeTabs
            tintColor={colors.primary}
            backgroundColor={colors.background}
        >
            <NativeTabs.Trigger name="record">
                <NativeTabs.Trigger.Label>{isRecording ? 'Recording' : 'Record'}</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon
                    sf={{ default: 'record.circle', selected: 'record.circle.fill' }}
                    md="fiber_manual_record"
                    selectedColor={isRecording ? recordingColor : undefined}
                />
                {isRecording && <NativeTabs.Trigger.Badge />}
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="import">
                <NativeTabs.Trigger.Label>Import</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon
                    sf={{ default: 'square.and.arrow.up', selected: 'square.and.arrow.up.fill' }}
                    md="file_upload"
                />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="transcription">
                <NativeTabs.Trigger.Label>Transcription</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon
                    sf={{ default: 'waveform.and.mic', selected: 'waveform.and.mic' }}
                    md="mic"
                />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="files">
                <NativeTabs.Trigger.Label>Files</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon
                    sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
                    md="settings"
                />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="more">
                <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon
                    sf="ellipsis"
                    md="more_horiz"
                />
            </NativeTabs.Trigger>
        </NativeTabs>
    )
}
