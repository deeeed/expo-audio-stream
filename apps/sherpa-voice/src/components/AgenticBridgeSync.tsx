/**
 * Invisible component that syncs route state into the agentic bridge.
 * Rendered inside _layout.tsx. Only active in __DEV__ mode.
 */

import { usePathname, useSegments } from 'expo-router'
import { useEffect } from 'react'

import {
  setAgenticModelActions,
  setAgenticModelState,
  setAgenticRouteInfo,
} from '../agentic-bridge'
import { useModelManagement } from '../contexts/ModelManagement'

export function AgenticBridgeSync() {
  if (!__DEV__) return null
  return <AgenticBridgeSyncInner />
}

function AgenticBridgeSyncInner() {
  const pathname = usePathname()
  const segments = useSegments()
  const {
    cancelDownload,
    downloadModel,
    getAvailableModels,
    getDownloadedModels,
    modelsState,
    refreshModelStatus,
  } = useModelManagement()

  useEffect(() => {
    setAgenticRouteInfo(pathname, segments)
  }, [pathname, segments])

  useEffect(() => {
    const availableModels = getAvailableModels()
    const downloadedModels = getDownloadedModels()
    const statuses = Object.fromEntries(
      Object.entries(modelsState).map(([modelId, state]) => [
        modelId,
        {
          error: state.error ?? null,
          lastDownloaded: state.lastDownloaded ?? null,
          localPath: state.localPath ?? null,
          name: state.metadata?.name ?? modelId,
          progress: state.progress ?? null,
          status: state.status,
          type: state.metadata?.type ?? null,
        },
      ])
    )

    setAgenticModelState({
      pathname,
      availableModelIds: availableModels.map((model) => model.id),
      downloadedModelIds: downloadedModels.map((model) => model.metadata.id),
      asrAvailableModelIds: availableModels
        .filter((model) => model.type === 'asr')
        .map((model) => model.id),
      asrDownloadedModelIds: downloadedModels
        .filter((model) => model.metadata.type === 'asr')
        .map((model) => model.metadata.id),
      statuses,
    })
  }, [getAvailableModels, getDownloadedModels, modelsState, pathname])

  useEffect(() => {
    setAgenticModelActions({
      cancelDownload,
      downloadModel,
      refreshModelStatus,
    })

    return () => {
      setAgenticModelActions({})
    }
  }, [cancelDownload, downloadModel, refreshModelStatus])

  return null
}
