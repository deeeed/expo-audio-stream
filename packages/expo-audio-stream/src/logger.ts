// packages/expo-audio-stream/src/logger.ts
import { getLogger as siteedGetLogger } from '@siteed/react-native-logger'

import { DEBUG_NAMESPACE } from './constants'

type ConsoleLike = {
    log: (message: string, ...args: unknown[]) => void
    debug: (message: string, ...args: unknown[]) => void
    warn: (message: string, ...args: unknown[]) => void
    error: (message: string, ...args: unknown[]) => void
}

export const getLogger = (tag: string): ConsoleLike => {
    const baseLogger = siteedGetLogger(`${DEBUG_NAMESPACE}:${tag}`)

    return {
        log: (...args: unknown[]) => baseLogger.log(...(args as [unknown])),
        debug: (...args: unknown[]) => baseLogger.debug(...(args as [unknown])),
        error: (...args: unknown[]) => baseLogger.error(...(args as [unknown])),
        warn: (...args: unknown[]) => baseLogger.warn(...(args as [unknown])),
    }
}

