// playground/src/app/(recordings)/[filename].tsx
import { Entypo } from '@expo/vector-icons'
import {
    AppTheme,
    ScreenWrapper,
    useBottomModal,
    useTheme,
    useToast,
} from '@siteed/design-system'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import {
    AudioRecordingConfigForm,
    SelectedAudioVisualizerProps,
} from '../../component/audio-recording-config/audio-recording-config-form'
import { useAudioFiles } from '../../context/AudioFilesProvider'
import { AudioRecordingView } from '../../component/audio-recording-view/audio-recording-view'

const getStyles = (_: { theme: AppTheme }) => {
    return StyleSheet.create({
        container: {
            paddingBottom: 80,
        },
    })
}

export const FullAudioViewerPage = () => {
    const theme = useTheme()
    const { colors } = theme

    const styles = useMemo(() => getStyles({ theme }), [theme])
    const { show } = useToast()

    const local = useLocalSearchParams<{
        filename: string
        tab?: string
    }>()

    const { files, removeFile } = useAudioFiles()

    const { filename } = local
    const selectedFile = files.find((file) => file.filename === filename)
    const navigator = useNavigation()

    const { openDrawer } = useBottomModal()

    const [config, setConfig] = useState<SelectedAudioVisualizerProps>({
        candleSpace: 2,
        candleWidth: 10,
        canvasHeight: 150,
        showRuler: true,
        showDottedLine: true,
        showSilence: false,
    })

    useEffect(() => {
        // Set navbar title
        navigator.setOptions({
            headerShow: true,
            headerBackTitleVisible: false,
            headerTitle: ({ tintColor }: { tintColor: string }) => {
                return (
                    <Text
                        style={{
                            fontSize: 16,
                            fontWeight: 'bold',
                            color: tintColor,
                        }}
                    >
                        Analysis
                    </Text>
                )
            },
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Pressable
                        onPress={async () => {
                            await openDrawer({
                                render: () => (
                                    <AudioRecordingConfigForm
                                        config={config}
                                        onChange={setConfig}
                                    />
                                ),
                            })
                        }}
                    >
                        {({ pressed }) => (
                            <Entypo
                                name="sound-mix"
                                size={25}
                                style={{
                                    marginRight: 15,
                                    opacity: pressed ? 0.5 : 1,
                                    color: pressed
                                        ? colors.primary
                                        : colors.text,
                                }}
                            />
                        )}
                    </Pressable>
                </View>
            ),
        })
    }, [navigator, selectedFile, setConfig, openDrawer, show])

    return (
        <ScreenWrapper contentContainerStyle={styles.container}>
            {selectedFile && (
                <AudioRecordingView
                    recording={selectedFile}
                    extractAnalysis
                    visualConfig={config}
                    onDelete={async () => {
                        if (!selectedFile) return
                        await removeFile(selectedFile.fileUri)
                        router.push('/files')
                    }}
                />
            )}
        </ScreenWrapper>
    )
}

export default FullAudioViewerPage
