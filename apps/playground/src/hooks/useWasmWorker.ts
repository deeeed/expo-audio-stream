import { useCallback, useRef, useEffect } from 'react';

export interface UseWasmWorkerOptions {
    onComplete?: () => void;
    onError?: (error: string) => void;
    onLog?: (message: string) => void;
}

export function useWasmWorker({ onComplete, onError, onLog }: UseWasmWorkerOptions) {
    // Keep a static worker instance that persists across hook instances
    const staticWorker = useRef<Worker>();
    const timeoutRef = useRef<NodeJS.Timeout>();

    // Initialize the static worker if it doesn't exist
    if (!staticWorker.current) {
        staticWorker.current = new Worker(
            new URL('/wasm/wasm-worker.js', window.location.href)
        );
    }

    const handleMessage = useCallback((event: MessageEvent) => {
        if (event.data.type === 'complete') {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            onComplete?.();
        } else if (event.data.type === 'error') {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            onError?.(event.data.error);
        } else if (event.data.type === 'log') {
            onLog?.(event.data.message);
        }
    }, [onComplete, onError, onLog]);

    // Set up message handler
    useEffect(() => {
        const worker = staticWorker.current;
        if (worker) {
            worker.addEventListener('message', handleMessage);
            return () => worker.removeEventListener('message', handleMessage);
        }
    }, [handleMessage]);

    const terminateWorker = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (staticWorker.current) {
            onLog?.('Terminating WASM worker...');
            staticWorker.current.postMessage({ type: 'terminate' });
        }
    }, [onLog]);

    const initWorker = useCallback(() => {
        const worker = staticWorker.current;
        if (!worker) return;

        terminateWorker();
        onLog?.('Starting WASM worker...');
        
        timeoutRef.current = setTimeout(() => {
            onError?.('Worker initialization timed out');
            terminateWorker();
        }, 5000);

        worker.postMessage({ type: 'init' });

        return terminateWorker;
    }, [onLog, onError, terminateWorker]);

    // Cleanup timeout on unmount, but keep the worker
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        initWorker,
        terminateWorker
    };
}