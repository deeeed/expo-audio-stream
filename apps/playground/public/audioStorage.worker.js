const openDatabase = ({ dbName, dbVersion }) => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion)

        request.onupgradeneeded = (event) => {
            const db = event.target.result
            if (!db.objectStoreNames.contains('audioFiles')) {
                db.createObjectStore('audioFiles', { keyPath: 'fileName' })
            }
        }

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

// Helper function to check if a file exists
const fileExists = async (fileName, dbName = 'AudioStorage', dbVersion = 1) => {
    const db = await openDatabase({ dbName, dbVersion })
    const transaction = db.transaction('audioFiles', 'readonly')
    const store = transaction.objectStore('audioFiles')
    
    return new Promise((resolve) => {
        const request = store.get(fileName)
        request.onsuccess = () => resolve(!!request.result)
        request.onerror = () => resolve(false)
    })
}

self.onmessage = async (e) => {
    const { type, payload } = e.data

    try {
        if (type === 'storeAudioFile') {
            const db = await openDatabase({ dbName: 'AudioStorage', dbVersion: 1 })
            const transaction = db.transaction('audioFiles', 'readwrite')
            const store = transaction.objectStore('audioFiles')
            
            await new Promise((resolve, reject) => {
                store.put(payload)
                transaction.oncomplete = () => resolve()
                transaction.onerror = () => reject(transaction.error)
            })

            self.postMessage({ type: 'success', fileName: payload.fileName })
        } else if (type === 'deleteAudioFile') {
            // First check if the file exists
            const exists = await fileExists(payload.fileName)
            if (!exists) {
                self.postMessage({ 
                    type: 'deleteSuccess', 
                    fileName: payload.fileName,
                    message: 'File did not exist, nothing to delete'
                })
                return
            }
            
            const db = await openDatabase({ dbName: 'AudioStorage', dbVersion: 1 })
            const transaction = db.transaction('audioFiles', 'readwrite')
            const store = transaction.objectStore('audioFiles')
            
            await new Promise((resolve, reject) => {
                const request = store.delete(payload.fileName)
                request.onsuccess = () => resolve()
                request.onerror = () => reject(request.error)
            })
            
            // Verify deletion
            const stillExists = await fileExists(payload.fileName)
            if (stillExists) {
                self.postMessage({ 
                    type: 'error', 
                    error: `Failed to delete ${payload.fileName}, file still exists after deletion attempt`,
                    fileName: payload.fileName
                })
                return
            }

            self.postMessage({ 
                type: 'deleteSuccess', 
                fileName: payload.fileName,
                message: 'File successfully deleted'
            })
        }
    } catch (error) {
        self.postMessage({ 
            type: 'error', 
            error: error.message,
            fileName: payload?.fileName
        })
    }
} 