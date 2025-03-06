import { Asset } from 'expo-asset'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { useCallback, useState } from 'react'
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
      
      // Get the filename from the asset or use the custom name, ensuring it has the correct extension
      let fileName = customFileName || asset.name || 'sample.audio'
      
      // Make sure the filename has the correct extension
      if (!fileName.toLowerCase().endsWith(`.${sourceExtension}`)) {
        fileName = fileName.replace(/\.\w+$/, '') + `.${sourceExtension}`
      }
      
      // Copy the file to a writable location (similar to DocumentPicker behavior)
      let fileUri = asset.localUri
      
      // On native platforms, copy to cache directory to ensure it's writable
      if (!isWeb && FileSystem.cacheDirectory) {
        const destinationUri = `${FileSystem.cacheDirectory}${fileName}`
        await FileSystem.copyAsync({
          from: asset.localUri,
          to: destinationUri
        })
        fileUri = destinationUri
        logger.debug('Copied sample audio to cache directory', { from: asset.localUri, to: fileUri })
        
        // For Essentia, remove the 'file://' prefix if it exists
        if (fileUri.startsWith('file://')) {
          fileUri = fileUri.substring(7) // Remove 'file://' prefix
          logger.debug('Adjusted file path for Essentia', { path: fileUri })
        }
      }
      
      // Get audio metadata using Expo AV
      let size = 0
      let durationMs = 0
      
      // Create a sound object
      const { sound: tempSound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: isWeb }, // Only auto-play on web to get duration
        null,
        true // Download first for accurate metadata
      )
      
      try {
        if (isWeb) {
          // For web: play and immediately stop to get accurate duration
          // This forces the browser to load the audio metadata
          await tempSound.playAsync()
          await tempSound.stopAsync()
        }
        
        // Get the loaded status to access metadata
        const loadedStatus = await tempSound.getStatusAsync()
        
        if (loadedStatus.isLoaded) {
          durationMs = loadedStatus.durationMillis || 0
          
          // For MP3 files, estimate size based on duration (128kbps bitrate)
          // 128 kilobits per second = 16 kilobytes per second
          const durationSec = durationMs / 1000
          size = Math.round(durationSec * 16 * 1024)
          
          logger.debug('Audio metadata loaded', {
            durationMs,
            estimatedSize: size,
            fileName
          })
        }
      } catch (error) {
        logger.warn('Error getting audio metadata:', error)
      } finally {
        // Always unload the temporary sound
        await tempSound.unloadAsync()
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
        isLoaded: true
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
    loadSampleAudio
  }
} 