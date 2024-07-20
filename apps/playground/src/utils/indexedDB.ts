// playground/src/utils/indexedDB.ts

import { AudioRecordingResult } from '@siteed/expo-audio-stream'
import { getLogger } from '@siteed/react-native-logger'

interface OpenDatabaseParams {
    dbName: string
    dbVersion: number
}

interface StoreAudioFileParams {
    fileName: string
    arrayBuffer: ArrayBuffer
    metadata: AudioRecordingResult
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
    metadata: AudioRecordingResult
}

const logger = getLogger('indexedDB')

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
}: StoreAudioFileParams) => {
    const db = await openDatabase({ dbName: 'AudioStorage', dbVersion: 1 })
    const transaction = db.transaction('audioFiles', 'readwrite')
    const store = transaction.objectStore('audioFiles')
    const record: AudioFileRecord = { fileName, arrayBuffer, metadata }
    store.put(record)

    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => {
            logger.debug(`Stored audio file ${fileName} successfully`, metadata)
            resolve()
        }

        transaction.onerror = () => {
            reject(transaction.error)
        }
    })
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
            resolve(request.result || null)
        }

        request.onerror = () => {
            reject(request.error)
        }
    })
}

/**
 * Deletes an audio file and its metadata from IndexedDB.
 * @param {DeleteAudioFileParams} params - The file name.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 */
export const deleteAudioFile = async ({
    fileName,
}: DeleteAudioFileParams): Promise<void> => {
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
