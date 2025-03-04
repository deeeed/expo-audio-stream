import { useState, useCallback, useRef } from 'react';
import { ExtractAudioDataOptions, ExtractedAudioData, TranscriberData, extractAudioData } from '@siteed/expo-audio-studio';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { isWeb } from '../../../../packages/expo-audio-ui/src/constants';
import { useTranscription } from '../context/TranscriptionProvider';
import { TranscribeParams } from '../context/TranscriptionProvider.types';
import { validateExtractedAudio } from '../utils/audioValidation';
import { baseLogger } from '../config';

const logger = baseLogger.extend('useAudioTranscription');

export interface SelectedFile {
  uri: string;
  size: number;
  name: string;
  duration?: number;
  fileType?: string;
}

export interface TranscriptionLog {
  modelId: string;
  fileName: string;
  processingDuration: number;
  fileDuration: number;
  timestamp: number;
  fileSize: number;
  extractedDuration: number;
  extractedSize: number;
  transcript?: string;
}

export interface ExtractDurationOption {
  label: string;
  value: number; // duration in milliseconds
}

export const EXTRACT_DURATION_OPTIONS: ExtractDurationOption[] = [
  { label: '3 sec', value: 3000 },
  { label: '5 sec', value: 5000 },
  { label: '10 sec', value: 10000 },
  { label: '30 sec', value: 30000 },
  { label: '1 min', value: 60000 },
  { label: 'Full', value: -1 }, // Special value for full file
];

export function useAudioTranscription() {
  const [transcriptionData, setTranscriptionData] = useState<TranscriberData>({
    id: '1',
    isBusy: false,
    text: '',
    startTime: 0,
    endTime: 0,
    chunks: [],
  });
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stopTranscription, setStopTranscription] = useState<(() => Promise<void>) | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [extractDuration, setExtractDuration] = useState<number>(3000);
  const [customDuration, setCustomDuration] = useState<number>(10000);
  const [isCustomDuration, setIsCustomDuration] = useState<boolean>(false);
  const [audioExtracted, setAudioExtracted] = useState<boolean>(false);
  const [extractedAudioData, setExtractedAudioData] = useState<ExtractedAudioData | null>(null);
  const processingTimer = useRef<ReturnType<typeof setInterval>>();
  const [currentProcessingTime, setCurrentProcessingTime] = useState<number>(0);
  const [lastTranscriptionLog, setLastTranscriptionLog] = useState<TranscriptionLog | null>(null);
  const [autoTranscribeOnSelect, setAutoTranscribeOnSelect] = useState(true);

  const { transcribe } = useTranscription();

  // Start transcription with explicit data
  const startTranscriptionWithData = useCallback(
    async ({ file, audioData }: { file: SelectedFile; audioData: ExtractedAudioData }) => {
      if (!file || !audioData) {
        logger.error('Missing required data for transcription', {
          file,
          audioData,
        });
        return;
      }

      try {
        setIsTranscribing(true);
        setProgress(0);
        setCurrentProcessingTime(0);

        processingTimer.current = setInterval(() => {
          setCurrentProcessingTime((prev) => prev + 1);
        }, 1000);

        setTranscriptionData({
          id: '1',
          isBusy: true,
          text: '',
          startTime: Date.now(),
          endTime: 0,
          chunks: [],
        });

        const startTime = Date.now();

        // Use the duration we already have from the file
        const fileDuration = file.duration || 0;

        const transcribeParams: Partial<TranscribeParams> = {
          jobId: '1',
          options: {
            tokenTimestamps: true,
            tdrzEnable: true,
          },
          onProgress(progress: number) {
            setProgress(progress);
          },
          onNewSegments(result) {
            setTranscriptionData((prev) => {
              const existingChunks = prev.chunks || [];
              const updatedChunks = [...existingChunks];

              // Convert segments to the format we need
              const newChunks = result.segments.map((segment) => ({
                text: segment.text.trim(),
                timestamp: [segment.t0 / 100, segment.t1 ? segment.t1 / 100 : null] as [number, number | null],
              }));

              newChunks.forEach((newChunk) => {
                const isDuplicate = existingChunks.some(
                  (existing) => existing.text === newChunk.text && existing.timestamp[0] === newChunk.timestamp[0]
                );
                if (!isDuplicate) {
                  updatedChunks.push(newChunk);
                }
              });

              return {
                ...prev,
                text: updatedChunks.map((chunk) => chunk.text).join(' '),
                chunks: updatedChunks,
              };
            });
          },
        };

        // Debug the extracted audio data
        logger.debug('Extracted audio data details:', {
          sampleRate: audioData.sampleRate,
          channels: audioData.channels,
          bitDepth: audioData.bitDepth,
          durationMs: audioData.durationMs,
          format: audioData.format,
          samples: audioData.samples,
          hasPcmData: !!audioData.pcmData,
          pcmDataLength: audioData.pcmData?.length,
          hasNormalizedData: !!audioData.normalizedData,
          normalizedDataLength: audioData.normalizedData?.length,
          hasBase64Data: !!audioData.base64Data,
          base64DataLength: audioData.base64Data?.length,
        });

        if (isWeb) {
          if (audioData.normalizedData) {
            transcribeParams.audioData = audioData.normalizedData;
          } else {
            // Use the PCM data directly since it already has a WAV header
            transcribeParams.audioUri = URL.createObjectURL(
              new Blob([audioData.pcmData], { type: 'audio/wav' })
            );
          }
        } else {
          // For native platforms, use base64 data if available
          if (audioData.base64Data) {
            logger.debug('Using base64 data for native transcription');
            transcribeParams.audioData = audioData.base64Data;
          } else {
            logger.debug('Using original file URI for native transcription');
            transcribeParams.audioUri = file.uri;
          }
        }

        logger.debug('Transcribe params:', transcribeParams);

        const { promise, stop } = await transcribe(transcribeParams as TranscribeParams);
        setStopTranscription(() => stop);

        const transcription = await promise;
        const endTime = Date.now();
        const processingDuration = (endTime - startTime) / 1000;

        // Calculate extracted audio size
        let extractedSize = 0;
        if (audioData.pcmData) {
          extractedSize = audioData.pcmData.byteLength;
        } else if (audioData.base64Data) {
          // Estimate size from base64 (4 chars in base64 = 3 bytes)
          extractedSize = Math.floor(audioData.base64Data.length * 0.75);
        }

        setLastTranscriptionLog({
          modelId: 'tiny',
          fileName: file.name ?? 'Unknown file',
          processingDuration,
          fileDuration,
          timestamp: endTime,
          fileSize: file.size ?? 0,
          extractedDuration: audioData.durationMs / 1000,
          extractedSize: extractedSize,
          transcript: transcription.text,
        });

        console.log('Final transcription:', transcription);
        setTranscriptionData(transcription);
      } catch (error) {
        console.error('Transcription error:', error);
        setTranscriptionData((prev) => ({
          ...prev,
          isBusy: false,
          text: 'Error during transcription: ' + (error instanceof Error ? error.message : String(error)),
          endTime: Date.now(),
        }));
      } finally {
        if (processingTimer.current) {
          clearInterval(processingTimer.current);
        }
        setIsTranscribing(false);
        setStopTranscription(null);
      }
    },
    [transcribe]
  );

  const startTranscription = useCallback(async () => {
    if (!selectedFile || !extractedAudioData) {
      logger.error('Missing required data for transcription', {
        selectedFile,
        extractedAudioData,
      });
      return;
    }

    await startTranscriptionWithData({ 
      file: selectedFile, 
      audioData: extractedAudioData 
    });
  }, [selectedFile, extractedAudioData, startTranscriptionWithData]);

  const handleStop = useCallback(async () => {
    if (stopTranscription) {
      await stopTranscription();
      setTranscriptionData((prev) => ({
        ...prev,
        isBusy: false,
        text: 'Transcription stopped',
        endTime: Date.now(),
      }));
    }
  }, [stopTranscription]);

  const handleExtractAudio = useCallback(
    async ({ file, duration }: { file?: SelectedFile; duration?: number } = {}) => {
      const fileToUse = file || selectedFile;
      const durationToUse = duration || (isCustomDuration ? customDuration : extractDuration);

      if (!fileToUse) {
        logger.error('No file selected');
        return;
      }

      try {
        // If a new file was passed, update the selectedFile state
        if (file && file !== selectedFile) {
          setSelectedFile(file);
        }
        
        setIsExtracting(true);
        setProgress(0);

        const options: ExtractAudioDataOptions = {
          fileUri: fileToUse.uri,
          includeBase64Data: true,
          includeNormalizedData: true,
          includeWavHeader: isWeb,
          startTimeMs: 0,
          logger,
          decodingOptions: {
            targetSampleRate: 16000,
            targetChannels: 1,
            targetBitDepth: 16,
            normalizeAudio: true,
          },
        };

        // Only add endTimeMs if we're not extracting the full file
        if (durationToUse !== -1) {
          options.endTimeMs = durationToUse;
        }

        logger.debug('Extract audio options:', options);
        const extractedData = await extractAudioData(options);

        // Use the shared validation utility
        validateExtractedAudio(extractedData, fileToUse.name);

        setExtractedAudioData(extractedData);
        setAudioExtracted(true);

        // Log success
        logger.debug('Audio extraction successful:', {
          fileName: fileToUse.name,
          duration: extractedData.durationMs,
          sampleRate: extractedData.sampleRate,
          channels: extractedData.channels,
        });

        // Auto-start transcription if this was triggered by auto-transcribe
        if (autoTranscribeOnSelect && file) {
          // Store the file and extracted data in local variables to ensure they're available
          const currentFile = fileToUse;
          const currentExtractedData = extractedData;

          // Wait for state updates to complete before starting transcription
          setTimeout(() => {
            // Use the local variables directly in a custom transcription function
            startTranscriptionWithData({ 
              file: currentFile, 
              audioData: currentExtractedData 
            });
          }, 300);
        }
      } catch (error) {
        console.error('Audio extraction error:', {
          error,
          fileName: fileToUse.name,
          fileType: fileToUse.fileType,
          fileSize: fileToUse.size,
        });
        alert('Failed to extract audio: ' + (error instanceof Error ? error.message : 'Unknown error'));
      } finally {
        setIsExtracting(false);
      }
    },
    [selectedFile, startTranscriptionWithData, extractDuration, customDuration, isCustomDuration, autoTranscribeOnSelect]
  );

  const handleFileSelection = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
    });

    if (!result.canceled && result.assets?.[0]) {
      const { uri, size = 0, name } = result.assets[0];
      const fileExtension = name.split('.').pop()?.toLowerCase();

      try {
        let audioUri = uri;

        // For base64 data URIs on web, convert to blob URL
        if (isWeb && uri.startsWith('data:')) {
          const response = await fetch(uri);
          const blob = await response.blob();
          audioUri = URL.createObjectURL(blob);
        }

        // Load the audio file
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: false },
          (status) => {
            logger.debug('Audio status update:', status);
          }
        );

        // Play and immediately stop to get accurate duration
        await sound.playAsync();
        await sound.stopAsync();

        // Get the status after playing
        const status = await sound.getStatusAsync();

        // Get duration and unload
        let fileDuration = 0;
        if (status.isLoaded && status.durationMillis) {
          fileDuration = status.durationMillis / 1000;
        }
        await sound.unloadAsync();

        // Clean up blob URL if we created one
        if (isWeb && audioUri !== uri) {
          URL.revokeObjectURL(audioUri);
        }

        logger.debug('Selected file details:', {
          name,
          size,
          extension: fileExtension,
          uri,
          durationSeconds: fileDuration,
          status: status.isLoaded ? status : 'not loaded',
        });

        const fileInfo = {
          uri,
          size,
          name,
          duration: fileDuration,
          fileType: fileExtension,
        };

        setSelectedFile(fileInfo);

        // Auto-extract and transcribe if enabled
        if (autoTranscribeOnSelect) {
          // Use a shorter duration (10 seconds) for auto-transcription
          setExtractDuration(10000);
          setTimeout(() => handleExtractAudio({ 
            file: fileInfo, 
            duration: 10000 
          }), 100);
        }
      } catch (error) {
        console.error('Error loading audio file:', error);
        alert(
          `Warning: Could not load audio metadata. The file may not be in a supported format. Error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
        const fileInfo = {
          uri,
          size,
          name,
          duration: 0,
          fileType: fileExtension,
        };
        setSelectedFile(fileInfo);
      }

      // Reset state for new file
      setTranscriptionData({
        id: '1',
        isBusy: false,
        text: '',
        startTime: 0,
        endTime: 0,
        chunks: [],
      });
      setProgress(0);
      setCurrentProcessingTime(0);
      setAudioExtracted(false);
      setExtractedAudioData(null);
    }
  }, [autoTranscribeOnSelect, handleExtractAudio]);

  const resetTranscriptionState = useCallback(() => {
    setAudioExtracted(false);
    setExtractedAudioData(null);
  }, []);

  return {
    // State
    transcriptionData,
    isTranscribing,
    isExtracting,
    progress,
    stopTranscription,
    selectedFile,
    extractDuration,
    customDuration,
    isCustomDuration,
    audioExtracted,
    extractedAudioData,
    currentProcessingTime,
    lastTranscriptionLog,
    autoTranscribeOnSelect,
    
    // Actions
    setExtractDuration,
    setCustomDuration,
    setIsCustomDuration,
    setAutoTranscribeOnSelect,
    startTranscription,
    handleStop,
    handleExtractAudio,
    handleFileSelection,
    resetTranscriptionState,
  };
}