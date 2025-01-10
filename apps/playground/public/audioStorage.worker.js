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
        }
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message })
    }
} 