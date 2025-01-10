// playground/src/app/(tabs)/files.tsx
import {
    AppTheme,
    Button,
    RefreshControl,
    Result,
    ScreenWrapper,
    Skeleton,
    useTheme,
    useToast,
} from '@siteed/design-system'
import { AudioRecording } from '@siteed/expo-audio-stream'
import { getLogger } from '@siteed/react-native-logger'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { FlatList, StyleSheet } from 'react-native'

import { AudioRecordingView } from '../../component/AudioRecordingView'
import { useAudioFiles } from '../../context/AudioFilesProvider'
import { formatBytes } from '../../utils/utils'
const logger = getLogger('FilesScreen')

const getStyles = ({ theme }: { theme: AppTheme }) => {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        contentContainer: {
            gap: 10,
            paddingBottom: 80,
        },
        recordingContainer: {
            gap: 10,
            borderWidth: 1,
        },
    })
}

const FilesScreen = () => {
    const { show } = useToast()
    const router = useRouter()
    const theme = useTheme()
    const styles = useMemo(() => getStyles({ theme }), [theme])

    const {
        ready,
        files,
        totalAudioStorageSize,
        removeFile,
        clearFiles,
        refreshFiles,
    } = useAudioFiles()

    useFocusEffect(
        useCallback(() => {
            refreshFiles()
        }, [refreshFiles])
    )

    const handleDelete = useCallback(
        async (recording: AudioRecording) => {
            logger.debug(`Deleting recording: ${recording.filename}`)
            try {
                await removeFile(recording)
                show({ type: 'success', message: 'Recording deleted' })
            } catch (error) {
                logger.error(
                    `Failed to delete recording: ${recording.filename}`,
                    error
                )
                show({ type: 'error', message: 'Failed to load audio data' })
            }
        },
        [removeFile, show]
    )

    if (!ready) {
        return (
            <Skeleton
                items={[
                    { circles: 1, bars: 3 },
                    { circles: 1, bars: 3 },
                ]}
            />
        )
    }

    if (!files || files.length === 0) {
        return (
            <ScreenWrapper useInsets style={styles.container}>
                <Result
                    title="No recordings found"
                    status="info"
                    style={{ padding: 20 }}
                    buttonText="Record"
                    onButtonPress={() => {
                        router.navigate('/record')
                    }}
                />
            </ScreenWrapper>
        )
    }

    return (
        <ScreenWrapper withScrollView={false} useInsets style={styles.container}>
            <FlatList
                data={files}
                keyExtractor={(item) => item.fileUri}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl refreshing={false} onRefresh={refreshFiles} />
                }
                ListHeaderComponent={
                    <Button
                        onPress={clearFiles}
                        buttonColor="red"
                        textColor="white"
                    >
                        Clear Directory ({formatBytes(totalAudioStorageSize)})
                    </Button>
                }
                renderItem={({ item }) => (
                    <AudioRecordingView
                        recording={item}
                        onDelete={() => handleDelete(item)}
                        onActionPress={() => {
                            router.push(`(recordings)/${item.filename}`)
                        }}
                        actionText="Visualize"
                    />
                )}
            />
        </ScreenWrapper>
    )
}

export default FilesScreen
