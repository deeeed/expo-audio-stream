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
            gap: 10,
            backgroundColor: theme.colors.background,
            justifyContent: 'center',
            paddingTop: 10,
            paddingBottom: 80,
            paddingHorizontal: 20,
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
            logger.debug(`Deleting recording: ${recording.fileUri}`)
            try {
                await removeFile(recording.fileUri)
                show({ type: 'success', message: 'Recording deleted' })
            } catch (error) {
                logger.error(
                    `Failed to delete recording: ${recording.fileUri}`,
                    error
                )
                show({ type: 'error', message: 'Failed to load audio data' })
            }
        },
        [removeFile]
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
                    buttonText="Record"
                    onButtonPress={() => {
                        router.push('/')
                    }}
                />
            </ScreenWrapper>
        )
    }

    return (
        <FlatList
            data={files}
            keyExtractor={(item) => item.fileUri}
            contentContainerStyle={styles.container}
            style={{ flex: 1 }}
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
                        // extract filename from uri
                        router.push(`(recordings)/${item.filename}`)
                    }}
                    actionText="Visualize"
                />
            )}
        />
    )
}

export default FilesScreen
