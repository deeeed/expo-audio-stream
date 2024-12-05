import { useToast } from '@siteed/design-system'
import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'

import { baseLogger } from '../config'

const logger = baseLogger.extend('useReanimatedWebHack')

export function useReanimatedWebHack() {
    const [isHackEnabled, setIsHackEnabled] = useState(false)
    const { show } = useToast()

    useEffect(() => {
        if (Platform.OS === 'web') {
            // Initialize state based on existing global._WORKLET
            const initialValue = !!global._WORKLET
            logger.log('initialValue', initialValue)
            setIsHackEnabled(initialValue)
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
    }
}
