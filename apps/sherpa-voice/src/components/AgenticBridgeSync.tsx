/**
 * Invisible component that syncs route state into the agentic bridge.
 * Rendered inside _layout.tsx. Only active in __DEV__ mode.
 */

import { usePathname, useSegments } from 'expo-router'
import { useEffect } from 'react'

import { setAgenticModelState, setAgenticRouteInfo } from '../agentic-bridge'

export function AgenticBridgeSync() {
  if (!__DEV__) return null
  return <AgenticBridgeSyncInner />
}

function AgenticBridgeSyncInner() {
  const pathname = usePathname()
  const segments = useSegments()

  useEffect(() => {
    setAgenticRouteInfo(pathname, segments)
  }, [pathname, segments])

  useEffect(() => {
    setAgenticModelState({ pathname })
  }, [pathname])

  return null
}
