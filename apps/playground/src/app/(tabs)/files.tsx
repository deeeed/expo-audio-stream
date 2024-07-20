// playground/src/app/(tabs)/files.tsx
import {
    Button,
    RefreshControl,
    Result,
    Skeleton,
    useToast,
} from '@siteed/design-system'
import { AudioRecording } from '@siteed/expo-audio-stream'
import { useLogger } from '@siteed/react-native-logger'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback } from 'react'
import { FlatList, StyleSheet } from 'react-native'

import { useAudioFiles } from '../../context/AudioFilesProvider'
import { formatBytes } from '../../utils/utils'
import { AudioRecordingView } from '../../component/audio-recording-view/audio-recording-view'

const FilesScreen = () => {
    const { logger } = useLogger('Files')
    const { show } = useToast()
    const router = useRouter()

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
            <FlatList
                data={[]}
                contentContainerStyle={styles.container}
                refreshControl={
                    <RefreshControl
                        refreshing={false}
                        onRefresh={refreshFiles}
                    />
                }
                ListEmptyComponent={
                    <Result
                        title="No recordings found"
                        status="info"
                        buttonText="Record"
                        onButtonPress={() => {
                            router.push('/')
                        }}
                    />
                }
                renderItem={() => null}
            />
        )
    }

    return (
        <FlatList
            data={files}
            keyExtractor={(item) => item.fileUri}
            contentContainerStyle={styles.container}
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

const styles = StyleSheet.create({
    container: {
        gap: 10,
        backgroundColor: '#fff',
        paddingTop: 10,
        paddingBottom: 80,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    recordingContainer: {
        gap: 10,
        borderWidth: 1,
    },
})

export default FilesScreen
