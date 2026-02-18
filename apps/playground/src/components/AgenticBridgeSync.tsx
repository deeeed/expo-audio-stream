/**
 * Invisible component that syncs route and audio state into the agentic bridge.
 * Rendered inside _layout.tsx as a child of both the router and AudioRecorderProvider.
 * Only active in __DEV__ mode — renders null in production.
 */

import { usePathname, useSegments } from 'expo-router'
import { useEffect } from 'react'

import { useSharedAudioRecorder } from '@siteed/expo-audio-studio'

import {
    setAgenticAudioState,
    setAgenticRouteInfo,
} from '../agentic-bridge'

export function AgenticBridgeSync() {
    if (!__DEV__) return null

    return <AgenticBridgeSyncInner />
}

function AgenticBridgeSyncInner() {
    const pathname = usePathname()
    const segments = useSegments()
    const { isRecording, isPaused, durationMs, size } =
        useSharedAudioRecorder()

    useEffect(() => {
        setAgenticRouteInfo(pathname, segments)
    }, [pathname, segments])

    useEffect(() => {
        setAgenticAudioState({
            isRecording,
            isPaused,
            durationMs,
            size,
        })
    }, [isRecording, isPaused, durationMs, size])

    return null
}
