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
                    logger.debug(`Deleted audio and metadata for ${audioUriORfilename}`);
                } else {
                    const directoryUri = FileSystem.documentDirectory;
                    const fullPath = audioUriORfilename.startsWith('file://')
                        ? audioUriORfilename
                        : `file://${audioUriORfilename}`;
                    
                    logger.debug(`Attempting to delete files for ${fullPath}`);
                    const jsonPath = fullPath.replace(/\.(wav|mp3|opus|aac)$/, '.json');

                    // Try to delete all possible audio files
                    const possibleExtensions = ['.wav', '.mp3', '.opus', '.aac'];
                    for (const ext of possibleExtensions) {
                        const audioPath = fullPath.replace(/\.(wav|mp3|opus|aac)$/, ext);
                        const audioInfo = await FileSystem.getInfoAsync(audioPath);
                        
                        if (audioInfo.exists) {
                            try {
                                await FileSystem.deleteAsync(audioPath, { idempotent: true });
                                logger.debug(`Successfully deleted audio file at ${audioPath}`);
                            } catch (deleteError) {
                                logger.error(`Failed to delete audio file at ${audioPath}`, deleteError);
                            }
                        }
                    }

                    // Also try without file:// prefix as fallback
                    if (audioUriORfilename.includes(directoryUri || '')) {
                        const localPath = audioUriORfilename.replace(directoryUri || '', '');
                        await FileSystem.deleteAsync(`${directoryUri}${localPath}`, { idempotent: true });
                    }

                    const jsonInfo = await FileSystem.getInfoAsync(jsonPath);
                    if (jsonInfo.exists) {
                        try {
                            await FileSystem.deleteAsync(jsonPath, { idempotent: true });
                            logger.debug(`Successfully deleted metadata file at ${jsonPath}`);
                        } catch (deleteError) {
                            logger.error(`Failed to delete metadata file at ${jsonPath}`, deleteError);
                        }
                    }

                    logger.debug(`Deletion process completed for ${fullPath}`);
                }
            } catch (error) {
                logger.error(
                    `Failed to delete audio and metadata for ${audioUriORfilename}`,
                    error
                );
            }
        },
        []
    );

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

                // Store clean directory path without file:// prefix
                const cleanDirectory = directoryUri.replace('file://', '')

                const fileList = await FileSystem.readDirectoryAsync(directoryUri)
                logger.debug(`Found files in directory`, fileList)
                
                const jsonFiles = fileList.filter((file) => file.endsWith('.json'))
                const processedFiles = new Set<string>()

                const audioStreamResults = await Promise.all(
                    jsonFiles.map(async (jsonFile) => {
                        try {
                            const jsonData = await FileSystem.readAsStringAsync(
                                `${directoryUri}${jsonFile}`
                            )
                            const metadata = JSON.parse(jsonData)
                            const baseName = jsonFile.replace('.json', '')
                            
                            if (processedFiles.has(baseName)) {
                                return null
                            }

                            processedFiles.add(baseName)

                            // Check for all supported audio formats
                            const supportedExtensions = ['.wav', '.mp3', '.opus', '.aac']
                            let audioExists = { exists: false }
                            let audioFile = ''

                            for (const ext of supportedExtensions) {
                                audioFile = `${baseName}${ext}`
                                audioExists = await FileSystem.getInfoAsync(`${directoryUri}${audioFile}`)
                                if (audioExists.exists) break
                            }
                                
                            let compressedExists = { exists: false }
                            if (metadata.compression?.compressedFileUri) {
                                const compressedFileName = metadata.compression.compressedFileUri.split('/').pop()
                                if (compressedFileName) {
                                    processedFiles.add(compressedFileName.replace(/\.(opus|aac|mp3)$/, ''))
                                    // Store clean paths without file:// prefix
                                    metadata.compression.compressedFileUri = `${cleanDirectory}${compressedFileName}`
                                    compressedExists = await FileSystem.getInfoAsync(`${directoryUri}${compressedFileName}`)
                                }
                            }

                            if (!audioExists.exists && !compressedExists.exists) {
                                logger.warn(`Neither original nor compressed file exists for ${baseName}`)
                                return null
                            }

                            return {
                                ...metadata,
                                // Store clean paths without file:// prefix
                                fileUri: `${cleanDirectory}${audioFile}`,
                                size: audioExists.exists && 'size' in audioExists ? audioExists.size : metadata.size,
                                compression: metadata.compression ? {
                                    ...metadata.compression,
                                    size: compressedExists.exists && 'size' in compressedExists ? compressedExists.size : metadata.compression.size
                                } : undefined
                            }
                        } catch (error) {
                            logger.error(`Error processing JSON file ${jsonFile}:`, error)
                            return null
                        }
                    })
                )

                // Clean up orphaned audio files
                for (const file of fileList) {
                    if (file.match(/\.(wav|mp3|opus|aac)$/)) {
                        const baseName = file.replace(/\.(wav|mp3|opus|aac)$/, '')
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
