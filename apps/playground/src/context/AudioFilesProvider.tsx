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
                const processedMetadata = new Set<string>() // Track processed base filenames

                // Process all audio files
                const audioStreamResults = await Promise.all(
                    fileList
                        .filter(file => /\.(wav|opus|aac)$/.test(file))
                        .map(async (audioFile) => {
                            const baseName = audioFile.replace(/\.(wav|opus|aac)$/, '')
                            
                            // Skip if we've already processed this base filename
                            if (processedMetadata.has(baseName)) {
                                return null
                            }

                            const jsonFile = jsonFiles.find(
                                (jf) => jf === `${baseName}.json`
                            )
                            
                            if (jsonFile) {
                                const jsonData = await FileSystem.readAsStringAsync(
                                    `${directoryUri}${jsonFile}`
                                )
                                const metadata = JSON.parse(jsonData)
                                
                                // Mark this base filename as processed
                                processedMetadata.add(baseName)

                                // If this is a WAV file with compression info, use the compressed file
                                if (metadata.compression?.compressedFileUri) {
                                    const compressedFileName = metadata.compression.compressedFileUri.split('/').pop()
                                    if (compressedFileName && fileList.includes(compressedFileName)) {
                                        return {
                                            ...metadata,
                                            fileUri: `${cleanDirectory}/${compressedFileName}`,
                                            // Update relevant fields for the compressed version
                                            mimeType: metadata.compression.mimeType,
                                            size: metadata.compression.size,
                                        }
                                    }
                                }

                                // Otherwise return the original file
                                return {
                                    fileUri: `${cleanDirectory}/${audioFile}`,
                                    ...metadata,
                                }
                            } else {
                                logger.warn(`No metadata found for ${audioFile}`)
                                
                                // Check if this file is referenced in any other metadata file
                                let isReferencedInMetadata = false
                                for (const jf of jsonFiles) {
                                    const jsonData = await FileSystem.readAsStringAsync(
                                        `${directoryUri}${jf}`
                                    )
                                    const metadata = JSON.parse(jsonData)
                                    
                                    if (metadata.compression?.compressedFileUri?.includes(audioFile)) {
                                        isReferencedInMetadata = true
                                        break
                                    }
                                }

                                if (!isReferencedInMetadata) {
                                    logger.warn(`No metadata references found for ${audioFile}, deleting file`)
                                    try {
                                        await deleteAudioAndMetadata(
                                            `${directoryUri}${audioFile}`
                                        )
                                    } catch {
                                        // ignore delete error
                                    }
                                }
                            }
                            return null
                        })
                )

                return audioStreamResults.filter(
                    (result) => result !== null
                ) as AudioRecording[]
            }
        } catch (error) {
            logger.error(`Failed to list audio files`, error)
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
