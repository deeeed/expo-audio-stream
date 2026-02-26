import { useCallback, useState } from 'react'

import { Asset } from 'expo-asset'
import { createAudioPlayer } from 'expo-audio'
import * as FileSystem from 'expo-file-system/legacy'

import { baseLogger } from '../config'
import { isWeb } from '../utils/utils'

const logger = baseLogger.extend('useSampleAudio')

export interface SampleAudioFile {
  uri: string
  name: string
  size: number
  durationMs: number
  isLoaded: boolean
}

export interface UseSampleAudioOptions {
  onError?: (error: Error) => void
}

// Use the parameter type from Asset.fromModule directly
export type AssetSourceType = Parameters<typeof Asset.fromModule>[0]

export function useSampleAudio(options?: UseSampleAudioOptions) {
  const [isLoading, setIsLoading] = useState(false)
  const [sampleFile, setSampleFile] = useState<SampleAudioFile | null>(null)

  const loadSampleAudio = useCallback(async (assetModule: AssetSourceType, customFileName?: string) => {
    try {
      setIsLoading(true)

      // Load the audio file using Expo Asset
      const asset = Asset.fromModule(assetModule)
      await asset.downloadAsync()

      if (!asset.localUri) {
        throw new Error('Failed to load sample audio file')
      }

      // Get the file extension from the asset URI or default to mp3
      const sourceExtension = asset.localUri.split('.').pop()?.toLowerCase() || 'mp3'

      // Get the filename from the asset or use the custom name
      let fileName = customFileName || asset.name || 'sample.audio'
      if (!fileName.toLowerCase().endsWith(`.${sourceExtension}`)) {
        fileName = fileName.replace(/\.\w+$/, '') + `.${sourceExtension}`
      }

      // Initialize fileUri with the asset's localUri
      let fileUri = asset.localUri

      // On native platforms, copy to cache directory
      if (!isWeb && FileSystem.cacheDirectory) {
        const destinationUri = `${FileSystem.cacheDirectory}${fileName}`
        await FileSystem.copyAsync({
          from: asset.localUri,
          to: destinationUri,
        })

        // For iOS, ensure we keep the 'file://' prefix for Audio
        fileUri = destinationUri
        logger.debug('Copied sample audio to cache directory', { from: asset.localUri, to: fileUri })

        // Only remove 'file://' prefix for Essentia operations, not for Audio
        const essentiaPath = fileUri.startsWith('file://') ? fileUri.substring(7) : fileUri
        logger.debug('Adjusted file path for Essentia', { path: essentiaPath })
      }

      // Get audio metadata using expo-audio
      let size = 0
      let durationMs = 0

      // Create a temporary player to get metadata
      const tempPlayer = createAudioPlayer({ uri: fileUri })

      try {
        // Wait for the player to load
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            resolve() // resolve anyway after timeout
          }, 5000)

          const checkLoaded = () => {
            if (tempPlayer.isLoaded) {
              clearTimeout(timeout)
              resolve()
            } else {
              setTimeout(checkLoaded, 50)
            }
          }
          checkLoaded()
        })

        if (tempPlayer.isLoaded) {
          durationMs = tempPlayer.duration * 1000 // convert seconds to ms

          // For MP3 files, estimate size based on duration (128kbps bitrate)
          // 128 kilobits per second = 16 kilobytes per second
          const durationSec = durationMs / 1000
          size = Math.round(durationSec * 16 * 1024)

          logger.debug('Audio metadata loaded', {
            durationMs,
            estimatedSize: size,
            fileName,
          })
        }
      } catch (error) {
        logger.warn('Error getting audio metadata:', error)
      } finally {
        // Always remove the temporary player
        tempPlayer.remove()
      }

      // If we couldn't determine size from audio metadata, try file system methods
      if (size === 0) {
        if (isWeb) {
          try {
            const blob = await (await fetch(fileUri)).blob()
            size = blob.size
          } catch (error) {
            logger.warn('Error getting file size via fetch:', error)
          }
        } else {
          try {
            const fileInfo = await FileSystem.getInfoAsync(fileUri)
            if (fileInfo.exists && 'size' in fileInfo) {
              size = fileInfo.size
            }
          } catch (error) {
            logger.warn('Error getting file info:', error)
          }
        }
      }

      const sampleAudioFile: SampleAudioFile = {
        uri: fileUri,
        name: fileName,
        size,
        durationMs,
        isLoaded: true,
      }

      setSampleFile(sampleAudioFile)
      return sampleAudioFile

    } catch (error) {
      logger.error('Error loading sample audio file:', error)
      options?.onError?.(error instanceof Error ? error : new Error('Failed to load sample audio'))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [options])

  return {
    isLoading,
    sampleFile,
    loadSampleAudio,
  }
}
