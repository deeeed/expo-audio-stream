// playground/src/utils/indexedDB.ts

import type { AudioRecording } from '@siteed/expo-audio-studio'
import { getLogger } from '@siteed/react-native-logger'

interface OpenDatabaseParams {
    dbName: string
    dbVersion: number
}

interface StoreAudioFileParams {
    fileName: string
    arrayBuffer: ArrayBuffer
    metadata: AudioRecording
    skipWorker?: boolean
}

interface GetAudioFileParams {
    fileName: string
}

interface DeleteAudioFileParams {
    fileName: string
}

interface AudioFileRecord {
    fileName: string
    arrayBuffer: ArrayBuffer
    metadata: AudioRecording
}

const logger = getLogger('indexedDB')

let worker: Worker | null = null

interface InitWorkerParams {
    audioStorageWorkerUrl: string
}

export function initWorker({ audioStorageWorkerUrl }: InitWorkerParams) {
    if (!worker && typeof Worker !== 'undefined') {
        worker = new Worker(audioStorageWorkerUrl)
    }
    return worker
}

/**
 * Opens an IndexedDB database with the specified name and version.
 * @param {OpenDatabaseParams} params - The database name and version.
 * @returns {Promise<IDBDatabase>} - A promise that resolves with the database instance.
 */
export const openDatabase = ({ dbName, dbVersion }: OpenDatabaseParams) => {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion)

        logger.debug(`Opening database ${dbName} with version ${dbVersion}`)
        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains('audioFiles')) {
                const objectStore = db.createObjectStore('audioFiles', {
                    keyPath: 'fileName',
                })
                objectStore.createIndex('metadata', 'metadata', {
                    unique: false,
                })
            }
        }

        request.onsuccess = () => {
            resolve(request.result)
        }

        request.onerror = () => {
            reject(request.error)
        }
    })
}

/**
 * Stores an audio file and its metadata in IndexedDB.
 * @param {StoreAudioFileParams} params - The file name, array buffer, and metadata.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 */
export const storeAudioFile = async ({
    fileName,
    arrayBuffer,
    metadata,
    skipWorker = false,
}: StoreAudioFileParams): Promise<void> => {
    try {
        // CRITICAL FIX: Ensure we have valid array buffer data
        // Check if arrayBuffer is actually a Blob (this can happen due to type coercion)
        if (arrayBuffer instanceof Blob || (typeof arrayBuffer === 'object' && arrayBuffer !== null && 'arrayBuffer' in arrayBuffer)) {
            logger.debug(`Converting Blob to ArrayBuffer`)
            try {
                // @ts-expect-error - Handle potential Blob object
                const buffer = await arrayBuffer.arrayBuffer()
                arrayBuffer = buffer
            } catch (error) {
                logger.error(`Failed to convert Blob to ArrayBuffer:`, error)
                throw new Error('Invalid audio data: Failed to convert to ArrayBuffer')
            }
        }
        
        // Simple size validation
        if (!(arrayBuffer instanceof ArrayBuffer) || arrayBuffer.byteLength === 0) {
            logger.error(`Invalid or empty ArrayBuffer`)
            throw new Error('Invalid audio data')
        }

        if (worker && !skipWorker) {
            return new Promise((resolve, reject) => {
                const handleMessage = (e: MessageEvent) => {
                    if (e.data.type === 'success' && e.data.fileName === fileName) {
                        worker?.removeEventListener('message', handleMessage)
                        logger.debug(`Stored audio file ${fileName} successfully in background`)
                        resolve()
                    } else if (e.data.type === 'error') {
                        worker?.removeEventListener('message', handleMessage)
                        reject(new Error(e.data.error))
                    }
                }

                worker?.addEventListener('message', handleMessage)
                worker?.postMessage({
                    type: 'storeAudioFile',
                    payload: { fileName, arrayBuffer, metadata },
                })
            })
        }

        // Fallback to synchronous storage if worker is not available or skipWorker is true
        const db = await openDatabase({ dbName: 'AudioStorage', dbVersion: 1 })
        const transaction = db.transaction('audioFiles', 'readwrite')
        const store = transaction.objectStore('audioFiles')
        const record: AudioFileRecord = { fileName, arrayBuffer, metadata }
        store.put(record)

        return new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => {
                logger.debug(`Stored audio file ${fileName} successfully`, {
                    fileSize: arrayBuffer.byteLength,
                })
                resolve()
            }

            transaction.onerror = () => {
                logger.error(`Failed to store ${fileName}:`, transaction.error ?? 'Unknown error')
                reject(transaction.error)
            }
        })
    } catch (error) {
        logger.error(`Error in storeAudioFile:`, error)
        throw error
    }
}

/**
 * Retrieves an audio file and its metadata from IndexedDB.
 * @param {GetAudioFileParams} params - The file name.
 * @returns {Promise<AudioFileRecord | null>} - A promise that resolves with the audio file record or null if not found.
 */
export const getAudioFile = async ({
    fileName,
}: GetAudioFileParams): Promise<AudioFileRecord | null> => {
    const db = await openDatabase({ dbName: 'AudioStorage', dbVersion: 1 })
    const transaction = db.transaction('audioFiles', 'readonly')
    const store = transaction.objectStore('audioFiles')
    const request = store.get(fileName)

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            if (request.result) {
                logger.debug(`Retrieved audio file ${fileName} successfully`)
            } else {
                logger.warn(`Audio file ${fileName} not found`)
            }
            resolve(request.result ?? null)
        }

        request.onerror = () => {
            reject(request.error)
        }
    })
}

/**
 * Checks if an audio file exists in IndexedDB, trying different extensions if needed.
 * @param {GetAudioFileParams} params - The file name.
 * @returns {Promise<boolean>} - A promise that resolves with true if the file exists, false otherwise.
 */
export const audioFileExists = async ({
    fileName,
}: GetAudioFileParams): Promise<boolean> => {
    // First try with the exact filename
    const db = await openDatabase({ dbName: 'AudioStorage', dbVersion: 1 })
    const transaction = db.transaction('audioFiles', 'readonly')
    const store = transaction.objectStore('audioFiles')
    const request = store.get(fileName)

    const exactMatch = await new Promise<boolean>((resolve) => {
        request.onsuccess = () => {
            resolve(!!request.result)
        }
        request.onerror = () => {
            resolve(false)
        }
    })

    if (exactMatch) {
        return true
    }

    // If no exact match and the filename has an extension, try with different extensions
    if (fileName.match(/\.(wav|mp3|opus|aac)$/)) {
        const baseFilename = fileName.replace(/\.(wav|mp3|opus|aac)$/, '')
        const possibleExtensions = ['wav', 'mp3', 'opus', 'aac']
        
        for (const ext of possibleExtensions) {
            const alternateFilename = `${baseFilename}.${ext}`
            if (alternateFilename !== fileName) {
                const altRequest = store.get(alternateFilename)
                const altMatch = await new Promise<boolean>((resolve) => {
                    altRequest.onsuccess = () => {
                        resolve(!!altRequest.result)
                    }
                    altRequest.onerror = () => {
                        resolve(false)
                    }
                })
                
                if (altMatch) {
                    logger.debug(`Found file with alternate extension: ${alternateFilename}`)
                    return true
                }
            }
        }
    }

    return false
}

/**
 * Deletes an audio file and its metadata from IndexedDB.
 * @param {DeleteAudioFileParams} params - The file name.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 */
export const deleteAudioFile = async ({
    fileName,
}: DeleteAudioFileParams): Promise<void> => {
    // First check if the file exists
    const exists = await audioFileExists({ fileName })
    if (!exists) {
        logger.warn(`File ${fileName} does not exist in IndexedDB, skipping deletion`)
        return
    }

    if (worker) {
        return new Promise<void>((resolve, reject) => {
            const handleMessage = (e: MessageEvent) => {
                if (e.data.type === 'deleteSuccess' && e.data.fileName === fileName) {
                    worker?.removeEventListener('message', handleMessage)
                    logger.debug(`Deleted audio file ${fileName} successfully in background`)
                    resolve()
                } else if (e.data.type === 'error') {
                    worker?.removeEventListener('message', handleMessage)
                    reject(new Error(e.data.error))
                }
            }

            worker?.addEventListener('message', handleMessage)
            worker?.postMessage({
                type: 'deleteAudioFile',
                payload: { fileName },
            })
        })
    }

    // Fallback to synchronous deletion if worker is not available
    return deleteDirectly(fileName)
}

// Helper function for direct deletion
async function deleteDirectly(fileName: string): Promise<void> {
    const db = await openDatabase({ dbName: 'AudioStorage', dbVersion: 1 })
    const transaction = db.transaction('audioFiles', 'readwrite')
    const store = transaction.objectStore('audioFiles')
    store.delete(fileName)

    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => {
            logger.debug(`Deleted audio file ${fileName} successfully`)
            resolve()
        }

        transaction.onerror = () => {
            logger.error(`Failed to delete ${fileName}:`, transaction.error)
            reject(transaction.error)
        }
    })
}

/**
 * Lists all audio files and their metadata from IndexedDB.
 * @returns {Promise<AudioFileRecord[]>} - A promise that resolves with an array of audio file records.
 */
export const listAudioFiles = async (): Promise<AudioFileRecord[]> => {
    const db = await openDatabase({ dbName: 'AudioStorage', dbVersion: 1 })
    const transaction = db.transaction('audioFiles', 'readonly')
    const store = transaction.objectStore('audioFiles')
    const request = store.getAll()

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(request.result || [])
        }

        request.onerror = () => {
            reject(request.error)
        }
    })
}

// Helper function to check if IndexedDB is supported
function isIndexedDBSupported(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
}

// Helper function to get IndexedDB instance
async function getIndexedDBInstance(): Promise<IDBDatabase> {
    return openDatabase({ dbName: 'AudioStorage', dbVersion: 1 });
}

export const getIndexedDBAudioFileMetadata = async (
    fileName: string
): Promise<AudioRecording | null> => {
    try {
        if (!isIndexedDBSupported()) {
            console.warn('IndexedDB is not supported in this browser')
            return null
        }

        const db = await getIndexedDBInstance()
        const transaction = db.transaction(['metadata'], 'readonly')
        const store = transaction.objectStore('metadata')
        
        const request = store.get(fileName)
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const metadata = request.result ?? null
                resolve(metadata)
            }
            
            request.onerror = (event: Event) => {
                logger.error('Error getting file metadata from IndexedDB', event)
                reject(new Error('Failed to retrieve file metadata from IndexedDB'))
            }
        })
    } catch (error) {
        logger.error('Error in getIndexedDBAudioFileMetadata', error)
        return null
    }
}