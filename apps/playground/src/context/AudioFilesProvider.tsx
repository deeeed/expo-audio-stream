// playground/src/context/AudioFilesProvider.tsx
import { AudioRecording } from '@siteed/expo-audio-stream'
import { getLogger } from '@siteed/react-native-logger'
import * as FileSystem from 'expo-file-system'
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react'

import {
    deleteAudioFile,
    listAudioFiles as listIndexedDBAudioFiles,
} from '../utils/indexedDB'
import { isWeb } from '../utils/utils'

interface AudioFilesContextValue {
    ready: boolean
    files: AudioRecording[]
    totalAudioStorageSize: number
    refreshFiles: () => Promise<void>
    removeFile: (audioRecording: AudioRecording) => Promise<void>
    clearFiles: () => Promise<void>
}

const AudioFilesContext = createContext<AudioFilesContextValue>({
    ready: false,
    files: [],
    totalAudioStorageSize: 0,
    refreshFiles: async () => {},
    removeFile: async () => {},
    clearFiles: async () => {},
})

const logger = getLogger('AudioFilesProvider')

export const AudioFilesProvider = ({
    children,
}: {
    children: React.ReactNode
}) => {
    const [files, setFiles] = useState<AudioRecording[]>([])
    const [ready, setReady] = useState<boolean>(false)
    const [totalAudioStorageSize, setTotalAudioStorageSize] =
        useState<number>(0)

    const calculateTotalAudioStorageSize = useCallback(
        (files: AudioRecording[]) => {
            return files.reduce((total, file) => total + file.size, 0)
        },
        []
    )


    const deleteAudioAndMetadata = useCallback(
        async (audioUriORfilename: string) => {
            try {
                if (isWeb) {
                    await deleteAudioFile({ fileName: audioUriORfilename });
                    logger.debug(
                        `Deleted audio and metadata for ${audioUriORfilename}`
                    );
                } else {
                    const jsonPath = audioUriORfilename.replace(
                        /\.(wav|opus|aac)$/,
                        '.json'
                    );

                    // Try to delete all possible audio files
                    const possibleExtensions = ['.wav', '.opus', '.aac'];
                    for (const ext of possibleExtensions) {
                        const audioPath = audioUriORfilename.replace(/\.(wav|opus|aac)$/, ext);
                        const audioExists = await FileSystem.getInfoAsync(audioPath);
                        if (audioExists.exists) {
                            await FileSystem.deleteAsync(audioPath);
                            logger.debug(`Deleted audio file at ${audioPath}`);
                        }
                    }

                    const jsonExists = await FileSystem.getInfoAsync(jsonPath)
                    if (jsonExists.exists) {
                        await FileSystem.deleteAsync(jsonPath)
                    } else {
                        logger.info(
                            `Metadata file does not exist at ${jsonPath}`
                        )
                    }

                    logger.debug(
                        `Deleted audio and metadata for ${audioUriORfilename}`
                    )
                }
            } catch (error) {
                logger.error(
                    `Failed to delete audio and metadata for ${audioUriORfilename}`,
                    error
                )
            }
        },
        []
    )

    const listAudioFiles = useCallback(async () => {
        try {
            if (isWeb) {
                const records = await listIndexedDBAudioFiles()
                logger.debug(`Found records in indexedDB`, records)
                return records.map((record) => {
                    const blob = new Blob([record.arrayBuffer], {
                        type: record.metadata.mimeType,
                    })
                    const webAudioUri = URL.createObjectURL(blob)
                    return { ...record.metadata, fileUri: webAudioUri }
                })
            } else {
                const directoryUri = FileSystem.documentDirectory
                if (!directoryUri) {
                    throw new Error(`No directoryUri found`)
                }

                const cleanDirectory = directoryUri
                    .replace('file://', '')
                    .replace(/\/$/, '')

                const fileList = await FileSystem.readDirectoryAsync(directoryUri)
                logger.debug(`Found files in directory`, fileList)
                
                // First, find all JSON metadata files
                const jsonFiles = fileList.filter((file) => file.endsWith('.json'))
                const processedFiles = new Set<string>() // Track processed files

                const audioStreamResults = await Promise.all(
                    jsonFiles.map(async (jsonFile) => {
                        try {
                            const jsonData = await FileSystem.readAsStringAsync(
                                `${directoryUri}${jsonFile}`
                            )
                            const metadata = JSON.parse(jsonData)
                            const baseName = jsonFile.replace('.json', '')
                            
                            // Skip if we've already processed this recording
                            if (processedFiles.has(baseName)) {
                                return null
                            }
                            processedFiles.add(baseName)

                            // If there's a compressed version, use that instead of the WAV
                            if (metadata.compression?.compressedFileUri) {
                                const compressedFileName = metadata.compression.compressedFileUri.split('/').pop()
                                if (compressedFileName && fileList.includes(compressedFileName)) {
                                    return {
                                        ...metadata,
                                        fileUri: `${cleanDirectory}/${compressedFileName}`,
                                        mimeType: metadata.compression.mimeType,
                                        size: metadata.compression.size,
                                    }
                                }
                            }

                            // Fall back to the original WAV file
                            const wavFile = `${baseName}.wav`
                            if (fileList.includes(wavFile)) {
                                return {
                                    ...metadata,
                                    fileUri: `${cleanDirectory}/${wavFile}`
                                }
                            }

                            return null
                        } catch (error) {
                            logger.error(`Error processing JSON file ${jsonFile}:`, error)
                            return null
                        }
                    })
                )

                // Clean up orphaned audio files
                for (const file of fileList) {
                    if (file.match(/\.(wav|opus|aac)$/)) {
                        const baseName = file.replace(/\.(wav|opus|aac)$/, '')
                        if (!processedFiles.has(baseName) && !file.includes('AV-Recording')) {
                            logger.warn(`Found orphaned audio file: ${file}, deleting`)
                            try {
                                await deleteAudioAndMetadata(`${directoryUri}${file}`)
                            } catch (error) {
                                logger.error(`Failed to delete orphaned file ${file}:`, error)
                            }
                        }
                    }
                }

                return audioStreamResults.filter(
                    (result): result is AudioRecording => result !== null
                )
            }
        } catch (error) {
            logger.error(`Failed to list audio files`, error)
            return []
        } finally {
            setReady(true)
        }
    }, [deleteAudioAndMetadata])


    const refreshFiles = useCallback(async () => {
        try {
            const loadedFiles = (await listAudioFiles()) || []
            setFiles(loadedFiles)
        } catch (error) {
            logger.error(`Failed to refresh files`, error)
        }
    }, [listAudioFiles])

    const removeFile = useCallback(
        async (audioRecording: AudioRecording) => {
            if (isWeb) {
                await deleteAudioAndMetadata(audioRecording.filename);
            } else {
                await deleteAudioAndMetadata(audioRecording.fileUri);
            }
            await refreshFiles();
        },
        [deleteAudioAndMetadata, refreshFiles]
    )

    const clearFiles = useCallback(async () => {
        try {
            if (isWeb) {
                await listIndexedDBAudioFiles().then((records) => {
                    return Promise.all(
                        records.map(async (record) => {
                            try {
                                await deleteAudioFile({
                                    fileName: record.metadata.filename,
                                })
                            } catch (error) {
                                logger.error(
                                    `Failed to delete file: ${record.metadata.fileUri}`,
                                    error
                                )
                            }
                        })
                    )
                })
                setFiles([])
            } else {
                const directoryUri = FileSystem.documentDirectory
                if (!directoryUri) {
                    throw new Error(`No directoryUri found`)
                }

                const fileList =
                    await FileSystem.readDirectoryAsync(directoryUri)
                logger.debug(`Found files in directory`, fileList)
                // delete all files
                await Promise.all(
                    fileList.map(async (file) => {
                        try {
                            logger.debug(`Deleting file: ${file}`)
                            await FileSystem.deleteAsync(
                                `${directoryUri}${file}`
                            )
                        } catch (error) {
                            logger.error(
                                `Failed to delete file: ${file}`,
                                error
                            )
                        }
                    })
                )
                await refreshFiles()
            }
        } catch (error) {
            logger.error(`Failed to clear files`, error)
        }
    }, [refreshFiles])

    useEffect(() => {
        refreshFiles()
    }, [refreshFiles])

    useEffect(() => {
        setTotalAudioStorageSize(calculateTotalAudioStorageSize(files))
    }, [files, calculateTotalAudioStorageSize])

    return (
        <AudioFilesContext.Provider
            value={{
                ready,
                files,
                totalAudioStorageSize,
                refreshFiles,
                removeFile,
                clearFiles,
            }}
        >
            {children}
        </AudioFilesContext.Provider>
    )
}

export const useAudioFiles = () => useContext(AudioFilesContext)
