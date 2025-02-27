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
import { FlatList, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AudioRecordingView } from '../../component/AudioRecordingView'
import { useAudioFiles } from '../../context/AudioFilesProvider'
import { formatBytes } from '../../utils/utils'
const logger = getLogger('FilesScreen')

const getStyles = ({ theme, insets }: { theme: AppTheme, insets?: { bottom: number, top: number } }) => {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        contentContainer: {
            gap: theme.spacing.gap || 10,
            paddingHorizontal: theme.padding.s,
            paddingBottom: insets?.bottom || 80,
            paddingTop: insets?.top || 0,
        },
        recordingContainer: {
            gap: 10,
            borderWidth: 1,
        },
        headerContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 10,
        },
    })
}

const FilesScreen = () => {
    const { show } = useToast()
    const router = useRouter()
    const theme = useTheme()
    const { bottom, top } = useSafeAreaInsets()
    const styles = useMemo(() => getStyles({ theme, insets: { bottom, top } }), [theme, bottom, top])

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
            // Only refresh files when the screen is focused
            let isActive = true;
            
            const loadFiles = async () => {
                if (isActive) {
                    logger.debug('Screen focused, refreshing files');
                    await refreshFiles();
                }
            };
            
            loadFiles();
            
            return () => {
                isActive = false;
            };
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
            <FlatList
                data={files}
                keyExtractor={(item, index) => `${item.fileUri}_${index}`}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl refreshing={false} onRefresh={refreshFiles} />
                }
                ListHeaderComponent={
                    <View style={styles.headerContainer}>
                        <Button
                            onPress={clearFiles}
                            buttonColor="red"
                            textColor="white"
                    >
                        Clear Directory ({formatBytes(totalAudioStorageSize)})
                    </Button>
                    </View>
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
    )
}

export default FilesScreen
