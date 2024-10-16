import 'intl-pluralrules'
// Keep polyfills at the top

import 'expo-router/entry'
import { setLoggerConfig } from '@siteed/react-native-logger'
import { Platform } from 'react-native'

setLoggerConfig({
    namespaces: '*',
    disableExtraParamsInConsole: Platform.OS !== 'web',
})

if (__DEV__) {
    const handlePromiseRejection = (
        _id: string,
        {
            message,
            stack,
        }: {
            message: string
            stack: string
        }
    ) => {
        console.warn('Unhandled promise rejection:', message)
        console.log('Stack trace:', stack)
    }

    // @ts-ignore
    if (global.HermesInternal) {
        // For Hermes engine
        // @ts-ignore
        global.HermesInternal.enablePromiseRejectionTracker?.(
            handlePromiseRejection
        )
    } else {
        // For other JS engines (e.g., JavaScriptCore)
        const tracking = require('promise/setimmediate/rejection-tracking')
        tracking.enable({
            allRejections: true,
            onUnhandled: handlePromiseRejection,
            onHandled: () => {
                // You can add custom handling for handled rejections here if needed
            },
        })
    }

    // Optional: Disable LogBox for promise rejections
    // LogBox.ignoreLogs(['Possible Unhandled Promise Rejection'])
}
