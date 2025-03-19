// playground/src/app/(recordings)/[filename].tsx
import { Entypo } from '@expo/vector-icons'
import {
    AppTheme,
    ScreenWrapper,
    useModal,
    useTheme
} from '@siteed/design-system'
import { router, useLocalSearchParams } from 'expo-router'
import React, { useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import {
    AudioRecordingConfigForm,
    SelectedAudioVisualizerProps,
} from '../../component/AudioRecordingConfigForm'
import { AudioRecordingView } from '../../component/AudioRecordingView'
import { useAudioFiles } from '../../context/AudioFilesProvider'
import { useScreenHeader } from '../../hooks/useScreenHeader'

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

    const local = useLocalSearchParams<{
        filename: string
        tab?: string
    }>()

    const { files, removeFile } = useAudioFiles()

    useScreenHeader({
        title: "Analysis",
        backBehavior: {
          fallbackUrl: "/files",
        },
        rightElements: () => (<View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
        </View>)
      });


    const { filename } = local
    const selectedFile = files.find((file) => file.filename === filename)

    const { openDrawer } = useModal()

    const [config, setConfig] = useState<SelectedAudioVisualizerProps>({
        candleSpace: 2,
        candleWidth: 10,
        canvasHeight: 150,
        showRuler: true,
        showDottedLine: true,
        showSilence: false,
    })

    return (
        <ScreenWrapper contentContainerStyle={styles.container}>
            {selectedFile && (
                <AudioRecordingView
                    recording={selectedFile}
                    audioAnalysis={selectedFile.analysisData}
                    visualConfig={config}
                    extractAnalysis={true}
                    showTranscript
                    onDelete={async () => {
                        if (!selectedFile) return

                        if (router.canGoBack()) {
                            router.back()
                        }

                        await removeFile(selectedFile)

                        router.navigate('/files')
                    }}
                />
            )}
        </ScreenWrapper>
    )
}

export default FullAudioViewerPage
