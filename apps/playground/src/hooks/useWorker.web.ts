import { useState } from 'react'

export interface MessageEventHandler {
    (event: MessageEvent): void
}

export interface UseWorkerParams {
    url: string
    messageEventHandler: MessageEventHandler
}

export function useWorker({
    url,
    messageEventHandler,
}: UseWorkerParams): Worker {
    // Create new worker once and never again
    const [worker] = useState(() => createWorker({ url, messageEventHandler }))
    return worker
}

export interface CreateWorkerParams {
    url: string
    messageEventHandler: MessageEventHandler
}

function createWorker({
    url,
    messageEventHandler,
}: CreateWorkerParams): Worker {
    const worker = new Worker(new URL(url, window.location.href), {
        type: 'module',
    })
    // Listen for messages from the Web Worker
    worker.addEventListener('message', messageEventHandler)
    return worker
}
