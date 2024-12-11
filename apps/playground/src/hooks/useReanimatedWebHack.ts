import { useToast } from '@siteed/design-system'
import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'

import { baseLogger } from '../config'

const logger = baseLogger.extend('useReanimatedWebHack')

export function useReanimatedWebHack() {
    const [isHackEnabled, setIsHackEnabled] = useState(false)
    const [isReady, setIsReady] = useState(false)
    const { show } = useToast()

    useEffect(() => {
        if (Platform.OS === 'web') {
            const initialValue = !!global._WORKLET
            logger.log('initialValue', initialValue)
            setIsHackEnabled(initialValue)
            setIsReady(true)
        } else {
            setIsReady(true)
        }
    }, [])

    const handleHackToggle = useCallback((value: boolean) => {
        logger.log('handleHackToggle', value)

        if (Platform.OS === 'web') {
            setIsHackEnabled(value)
            if (value) {
                global._WORKLET = false
                // @ts-expect-error
                global._log = console.log
                // @ts-expect-error
                global._getAnimationTimestamp = () => performance.now()
                // @ts-expect-error
                global.__reanimatedLoggerConfig = { native: false }
                show({
                    type: 'success',
                    iconVisible: true,
                    message: 'Reanimated Web Hack Enabled',
                })
            } else {
                delete global._WORKLET
                // @ts-expect-error
                delete global._log
                // @ts-expect-error
                delete global._getAnimationTimestamp
                // @ts-expect-error
                delete global.__reanimatedLoggerConfig
                show({
                    type: 'warning',
                    iconVisible: true,
                    message: 'Reanimated Web Hack Disabled',
                })
            }
        }
    }, [])

    return {
        isHackEnabled,
        handleHackToggle,
        isReady,
    }
}
