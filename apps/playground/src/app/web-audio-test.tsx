import { ScreenWrapper } from '@siteed/design-system';
import { useAudioRecorder } from '@siteed/expo-audio-studio';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card } from 'react-native-paper';
import { baseLogger } from '../config';

// Add type declaration for webkitAudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

const logger = baseLogger.extend('test-record-direct');

// Format time in mm:ss format
const formatTime = (ms: number): string => {
  if (!ms || isNaN(ms)) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Helper function for formatting bytes with units
const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// For storing audio chunks and comparing them
interface AudioChunkInfo {
  blob: Blob;
  position: number;
  size: number;
  timestamp: number;
  chunkId?: number;
}

// Add function to compare audio files after the compareAudioFiles function
const compareAudioWaveforms = async (directUrl: string, concatenatedUrl: string, addLog: (message: string) => void, setResult: (result: string) => void) => {
  if (!directUrl || !concatenatedUrl) {
    addLog('Missing URLs for waveform comparison');
    return;
  }

  addLog('Starting detailed waveform comparison...');
  setResult('Analyzing waveforms...');

  try {
    // Create audio context for analysis
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Fetch and decode both audio files
    const [directResponse, concatenatedResponse] = await Promise.all([
      fetch(directUrl),
      fetch(concatenatedUrl)
    ]);
    
    const [directBuffer, concatenatedBuffer] = await Promise.all([
      directResponse.arrayBuffer(),
      concatenatedResponse.arrayBuffer()
    ]);
    
    const [directAudioData, concatenatedAudioData] = await Promise.all([
      audioContext.decodeAudioData(directBuffer),
      audioContext.decodeAudioData(concatenatedBuffer)
    ]);
    
    // Basic comparison
    const directDuration = directAudioData.duration;
    const concatenatedDuration = concatenatedAudioData.duration;
    const directChannelData = directAudioData.getChannelData(0);
    const concatenatedChannelData = concatenatedAudioData.getChannelData(0);
    
    let result = `Direct audio: ${directDuration.toFixed(2)}s, ${directChannelData.length} samples\n`;
    result += `Concatenated audio: ${concatenatedDuration.toFixed(2)}s, ${concatenatedChannelData.length} samples\n`;
    result += `Duration difference: ${Math.abs(directDuration - concatenatedDuration).toFixed(3)}s\n`;
    
    // Check for duplication by sampling waveform at regular intervals
    const sampleCount = 20; // Number of points to compare
    const directStep = Math.floor(directChannelData.length / sampleCount);
    const concatStep = Math.floor(concatenatedChannelData.length / sampleCount);
    
    result += "\nWaveform sample comparison:\n";
    result += "Position   Direct      Concat      Diff\n";
    
    let significantDifferences = 0;
    
    for (let i = 0; i < sampleCount; i++) {
      const directIndex = i * directStep;
      const concatIndex = i * concatStep;
      
      if (directIndex >= directChannelData.length || concatIndex >= concatenatedChannelData.length) {
        break;
      }
      
      const directValue = directChannelData[directIndex];
      const concatValue = concatenatedChannelData[concatIndex];
      const diff = Math.abs(directValue - concatValue);
      
      const percentPos = Math.round((i / sampleCount) * 100);
      result += `${percentPos}%`.padEnd(10);
      result += `${directValue.toFixed(4)}`.padEnd(12);
      result += `${concatValue.toFixed(4)}`.padEnd(12);
      result += `${diff.toFixed(4)}\n`;
      
      if (diff > 0.1) {
        significantDifferences++;
      }
    }
    
    if (significantDifferences > sampleCount / 3) {
      result += "\nSIGNIFICANT DIFFERENCES DETECTED - Audio waveforms do not match!\n";
      result += "This suggests chunks may be missing, duplicated, or out of order.\n";
    } else if (significantDifferences > 0) {
      result += "\nMinor differences detected. Some audio chunks may be different.\n";
    } else {
      result += "\nNo significant differences in waveform samples.\n";
    }
    
    addLog(result);
    setResult(result);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addLog(`Error comparing waveforms: ${errorMessage}`);
    setResult(`Waveform comparison error: ${errorMessage}`);
  }
};

export default function WebAudioTestPage() {
  // Direct expo-audio-studio recorder
  const {
    durationMs,
    size,
    compression,
    isRecording,
    isPaused,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording
  } = useAudioRecorder();

  // Debug state
  const [logs, setLogs] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uncompressedAudioUrl, setUncompressedAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingUncompressed, setIsPlayingUncompressed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio player refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const uncompressedAudioRef = useRef<HTMLAudioElement | null>(null);
  const concatenatedAudioRef = useRef<HTMLAudioElement | null>(null);
  const isWeb = Platform.OS === 'web';

  // For storing audio chunks and comparing them
  const [audioChunks, setAudioChunks] = useState<AudioChunkInfo[]>([]);
  const [pcmChunks, setPcmChunks] = useState<Float32Array[]>([]);
  const [concatenatedAudioUrl, setConcatenatedAudioUrl] = useState<string | null>(null);
  const [isPlayingConcatenated, setIsPlayingConcatenated] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);

  // Log function
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logMessage = `[${timestamp}] ${message}`;
    logger.debug(logMessage);
    setLogs(prev => [logMessage, ...prev].slice(0, 100));
  }, []);

  // Clean up function
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (concatenatedAudioUrl) {
        URL.revokeObjectURL(concatenatedAudioUrl);
      }
      if (uncompressedAudioUrl) {
        URL.revokeObjectURL(uncompressedAudioUrl);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (concatenatedAudioRef.current) {
        concatenatedAudioRef.current.pause();
        concatenatedAudioRef.current.src = '';
      }
      if (uncompressedAudioRef.current) {
        uncompressedAudioRef.current.pause();
        uncompressedAudioRef.current.src = '';
      }
    };
  }, [audioUrl, concatenatedAudioUrl, uncompressedAudioUrl]);

  // Utility to write strings to DataView
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // Create WAV from PCM data
  const createWavFromPcmData = useCallback(() => {
    if (!isWeb || pcmChunks.length === 0) return null;

    try {
      addLog(`Creating WAV from ${pcmChunks.length} PCM chunks`);
      
      // Determine the total number of samples
      const totalSamples = pcmChunks.reduce((total, chunk) => total + chunk.length, 0);
      
      // Create a single merged Float32Array
      const mergedPcm = new Float32Array(totalSamples);
      let offset = 0;
      pcmChunks.forEach(chunk => {
        mergedPcm.set(chunk, offset);
        offset += chunk.length;
      });
      
      // Convert Float32Array PCM (-1.0 to 1.0) to 16-bit PCM
      const sampleRate = 44100; // Use default or get from recorder
      const numChannels = 1;    // Mono
      const bitsPerSample = 16; // 16-bit PCM
      
      const dataLength = mergedPcm.length * 2; // 16-bit = 2 bytes per sample
      const buffer = new ArrayBuffer(44 + dataLength); // WAV header is 44 bytes
      const view = new DataView(buffer);
      
      // Write WAV header
      // RIFF chunk descriptor
      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + dataLength, true);
      writeString(view, 8, 'WAVE');
      
      // FMT sub-chunk
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true); // subchunk size (16 for PCM)
      view.setUint16(20, 1, true);  // audio format (1 for PCM)
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true); // byte rate
      view.setUint16(32, numChannels * bitsPerSample / 8, true); // block align
      view.setUint16(34, bitsPerSample, true);
      
      // DATA sub-chunk
      writeString(view, 36, 'data');
      view.setUint32(40, dataLength, true);
      
      // Convert Float32 to Int16
      const samples = new Int16Array(mergedPcm.length);
      for (let i = 0; i < mergedPcm.length; i++) {
        // Scale Float32 PCM data (-1.0 to 1.0) to Int16 (-32768 to 32767)
        const sample = Math.max(-1, Math.min(1, mergedPcm[i]));
        samples[i] = Math.round(sample * 32767);
      }
      
      // Write the samples to the data section
      let sampleIndex = 0;
      for (let i = 44; i < buffer.byteLength; i += 2) {
        view.setInt16(i, samples[sampleIndex++], true);
      }
      
      // Create WAV blob
      const wavBlob = new Blob([buffer], { type: 'audio/wav' });
      const wavUrl = URL.createObjectURL(wavBlob);
      
      addLog(`Created WAV from PCM: ${formatBytes(wavBlob.size)}`);
      return wavUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error creating WAV from PCM: ${errorMessage}`);
      return null;
    }
  }, [pcmChunks, isWeb, addLog]);

  // Analyze PCM chunks for overlap or gaps
  const analyzePcmChunks = useCallback(() => {
    if (pcmChunks.length <= 1) {
      addLog("Not enough PCM chunks to analyze for overlap");
      return "Not enough PCM chunks to analyze";
    }

    let result = `Analyzing ${pcmChunks.length} PCM chunks:\n`;
    
    // Create a map of chunk info with sample signatures
    const chunkAnalysis = pcmChunks.map((chunk, index) => {
      // Get some stats
      const min = Math.min(...Array.from(chunk));
      const max = Math.max(...Array.from(chunk));
      const avg = Array.from(chunk).reduce((a, b) => a + b, 0) / chunk.length;
      
      return {
        index,
        length: chunk.length,
        min,
        max,
        avg
      };
    });
    
    // Check for potential duplicates or overlaps
    let duplicatesFound = false;
    for (let i = 1; i < chunkAnalysis.length; i++) {
      const current = chunkAnalysis[i];
      const previous = chunkAnalysis[i-1];
      
      // Check for similar stats which might indicate duplicates
      const avgDiff = Math.abs(current.avg - previous.avg);
      const minDiff = Math.abs(current.min - previous.min);
      const maxDiff = Math.abs(current.max - previous.max);
      
      if (avgDiff < 0.001 && minDiff < 0.001 && maxDiff < 0.001) {
        result += `\nSTATS MATCH: Chunks ${i-1} and ${i} have very similar stats (avg=${avgDiff.toFixed(5)}) - possible duplicates!\n`;
        duplicatesFound = true;
      }
    }
    
    if (!duplicatesFound) {
      result += "\nNo obvious duplicates found based on chunk signatures and stats.\n";
    }
    
    // Log all chunk info
    result += "\nChunk Details:\n";
    chunkAnalysis.forEach(chunk => {
      result += `Chunk ${chunk.index}: length=${chunk.length}, avg=${chunk.avg.toFixed(3)}, min=${chunk.min.toFixed(3)}, max=${chunk.max.toFixed(3)}\n`;
    });
    
    addLog(result);
    return result;
  }, [pcmChunks, addLog]);

  // Create a concatenated audio blob from collected chunks
  const createConcatenatedAudio = useCallback(() => {
    if (!isWeb || audioChunks.length === 0) return;

    try {
      addLog(`Creating concatenated audio from ${audioChunks.length} chunks`);

      // Log chunk sequence for debugging
      audioChunks.forEach((chunk, index) => {
        addLog(`  Chunk ${index}: position=${chunk.position.toFixed(3)}s, size=${formatBytes(chunk.size)}`);
      });

      // Sort chunks by position if needed
      const sortedChunks = [...audioChunks].sort((a, b) => a.position - b.position);

      // Create a new blob from all chunks
      const concatenatedBlob = new Blob(sortedChunks.map(chunk => chunk.blob), {
        type: compression?.format === 'opus' ? 'audio/ogg' : 'audio/wav'
      });

      addLog(`Concatenated blob created, size: ${formatBytes(concatenatedBlob.size)}`);

      // Create URL for the blob
      const blobUrl = URL.createObjectURL(concatenatedBlob);
      setConcatenatedAudioUrl(blobUrl);

      return blobUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error creating concatenated audio: ${errorMessage}`);
      setError(`Concatenation error: ${errorMessage}`);
      return null;
    }
  }, [audioChunks, isWeb, compression, addLog]);

  // Start recording
  const handleStartRecording = useCallback(async () => {
    try {
      addLog('Starting direct recording with expo-audio-studio...');

      // Clear previous data
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      if (concatenatedAudioUrl) {
        URL.revokeObjectURL(concatenatedAudioUrl);
        setConcatenatedAudioUrl(null);
      }
      setAudioChunks([]);
      setComparisonResult(null);

      // Clear audio elements
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (concatenatedAudioRef.current) {
        concatenatedAudioRef.current.pause();
        concatenatedAudioRef.current.src = '';
        concatenatedAudioRef.current = null;
      }

      const result = await startRecording({
        interval: 500, // 500ms chunks
        enableProcessing: false,
        showNotification: false,
        output: {
          primary: { enabled: true },
          compressed: {
            enabled: true,
            format: 'opus',
            bitrate: 24000,
          },
        },
        onAudioStream: async (event) => {
          // For compressed audio chunks (opus/aac)
          if (isWeb && event.compression?.data instanceof Blob) {
            // Store the position with each chunk to help with debugging
            const chunkInfo: AudioChunkInfo = {
              blob: event.compression.data as Blob,
              position: event.position,
              size: (event.compression.data as Blob).size,
              timestamp: Date.now(),
              chunkId: audioChunks.length  // Add current length as ID
            };
            
            setAudioChunks(prevChunks => {
              // Check if this is likely a duplicate based on timestamps
              if (prevChunks.length > 0) {
                const lastChunk = prevChunks[prevChunks.length - 1];
                const timeDelta = chunkInfo.timestamp - lastChunk.timestamp;
                const positionDelta = Math.abs(chunkInfo.position - lastChunk.position);
                
                // If chunks arrive too close together and have similar positions, log but still collect
                if (timeDelta < 200 && positionDelta < 0.05) {
                  addLog(`POTENTIAL DUPLICATE: chunk #${chunkInfo.chunkId}, timeDelta=${timeDelta}ms, posDelta=${positionDelta.toFixed(5)}s`);
                }
              }
              
              // Always collect the chunk
              return [...prevChunks, chunkInfo];
            });
            
            addLog(`Compressed chunk #${audioChunks.length}: size=${formatBytes((event.compression?.data as Blob).size)}, position=${event.position.toFixed(3)}s`);
          }
          
          // For uncompressed PCM/Float32 data
          if (isWeb && event.data instanceof Float32Array) {
            // Get some basic stats about this chunk
            const min = Math.min(...Array.from(event.data));
            const max = Math.max(...Array.from(event.data));
            const avg = Array.from(event.data).reduce((a, b) => a + b, 0) / event.data.length;
            
            // Add PCM chunk to our collection
            setPcmChunks(prevChunks => {
              const newChunks = [...prevChunks, new Float32Array(event.data as Float32Array)];
              addLog(`PCM chunk #${prevChunks.length}: samples=${event.data.length}, position=${event.position.toFixed(3)}s, min=${min.toFixed(3)}, max=${max.toFixed(3)}, avg=${avg.toFixed(3)}`);
              return newChunks;
            });
          }
          
          addLog(`Audio data: size=${event.eventDataSize}, position=${event.position.toFixed(3)}s, has compression=${!!event.compression}, type=${event.data instanceof Float32Array ? 'PCM' : 'blob'}`);
          return Promise.resolve();
        }
      });

      addLog(`Recording started: ${JSON.stringify(result)}`);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error starting recording: ${errorMessage}`);
      setError(`Recording error: ${errorMessage}`);
    }
  }, [startRecording, addLog, audioUrl, concatenatedAudioUrl]);

  // Stop recording
  const handleStopRecording = useCallback(async () => {
    try {
      addLog('Stopping recording...');

      const result = await stopRecording();

      addLog(`Recording stopped. Duration: ${formatTime(result.durationMs)}, Size: ${formatBytes(result.size)}`);

      if (result.fileUri && isWeb) {
        // For web, create a blob URL from the audio data
        addLog(`Direct file URI from stopRecording: ${result.fileUri}`);
        setAudioUrl(result.fileUri);

        // Create uncompressed WAV file from PCM chunks
        if (pcmChunks.length > 0) {
          const uncompressedUrl = createWavFromPcmData();
          if (uncompressedUrl) {
            setUncompressedAudioUrl(uncompressedUrl);
            addLog(`Created uncompressed WAV URL: ${uncompressedUrl}`);
          }
        }

        // Create concatenated audio blob from compressed chunks
        if (audioChunks.length > 0) {
          const concatenatedUrl = createConcatenatedAudio();
          addLog(`Created concatenated audio URL: ${concatenatedUrl}`);
        } else {
          addLog('No audio chunks collected for concatenation');
        }
      } else if (result.fileUri) {
        // For native platforms
        addLog(`File URI: ${result.fileUri}`);
        setAudioUrl(result.fileUri);
      } else {
        addLog('No file URI returned');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error stopping recording: ${errorMessage}`);
      setError(`Stop recording error: ${errorMessage}`);
    }
  }, [stopRecording, addLog, isWeb, audioChunks, createConcatenatedAudio, pcmChunks, createWavFromPcmData]);

  // Play/pause direct recorded audio (web only)
  const handlePlayAudio = useCallback(() => {
    if (!audioUrl || !isWeb) return;

    try {
      if (!audioRef.current) {
        addLog('Creating new audio element for direct recording');
        audioRef.current = new Audio(audioUrl);

        // Add event listeners
        audioRef.current.addEventListener('play', () => {
          addLog('Direct audio playback started');
          setIsPlaying(true);
        });

        audioRef.current.addEventListener('pause', () => {
          addLog('Direct audio playback paused');
          setIsPlaying(false);
        });

        audioRef.current.addEventListener('ended', () => {
          addLog('Direct audio playback ended');
          setIsPlaying(false);
        });

        audioRef.current.addEventListener('error', (e) => {
          const errorMsg = (e.target as HTMLAudioElement).error?.message || 'Unknown error';
          addLog(`Direct audio playback error: ${errorMsg}`);
          setError(`Direct playback error: ${errorMsg}`);
          setIsPlaying(false);
        });

        audioRef.current.addEventListener('loadedmetadata', () => {
          addLog(`Direct audio duration: ${audioRef.current?.duration} seconds`);
        });
      }

      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.currentTime = 0; // Start from beginning
        audioRef.current.play().catch(err => {
          addLog(`Direct play error: ${err.message}`);
          setError(`Direct play error: ${err.message}`);
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error handling direct audio: ${errorMessage}`);
      setError(`Direct audio error: ${errorMessage}`);
    }
  }, [audioUrl, isPlaying, isWeb, addLog]);

  // Play/pause concatenated audio (web only)
  const handlePlayConcatenatedAudio = useCallback(() => {
    if (!concatenatedAudioUrl || !isWeb) return;

    try {
      if (!concatenatedAudioRef.current) {
        addLog('Creating new audio element for concatenated audio');
        concatenatedAudioRef.current = new Audio(concatenatedAudioUrl);

        // Add event listeners
        concatenatedAudioRef.current.addEventListener('play', () => {
          addLog('Concatenated audio playback started');
          setIsPlayingConcatenated(true);
        });

        concatenatedAudioRef.current.addEventListener('pause', () => {
          addLog('Concatenated audio playback paused');
          setIsPlayingConcatenated(false);
        });

        concatenatedAudioRef.current.addEventListener('ended', () => {
          addLog('Concatenated audio playback ended');
          setIsPlayingConcatenated(false);
        });

        concatenatedAudioRef.current.addEventListener('error', (e) => {
          const errorMsg = (e.target as HTMLAudioElement).error?.message || 'Unknown error';
          addLog(`Concatenated audio playback error: ${errorMsg}`);
          setError(`Concatenated playback error: ${errorMsg}`);
          setIsPlayingConcatenated(false);
        });

        concatenatedAudioRef.current.addEventListener('loadedmetadata', () => {
          addLog(`Concatenated audio duration: ${concatenatedAudioRef.current?.duration} seconds`);
        });
      }

      if (isPlayingConcatenated) {
        concatenatedAudioRef.current.pause();
      } else {
        concatenatedAudioRef.current.currentTime = 0; // Start from beginning
        concatenatedAudioRef.current.play().catch(err => {
          addLog(`Concatenated play error: ${err.message}`);
          setError(`Concatenated play error: ${err.message}`);
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error handling concatenated audio: ${errorMessage}`);
      setError(`Concatenated audio error: ${errorMessage}`);
    }
  }, [concatenatedAudioUrl, isPlayingConcatenated, isWeb, addLog]);

  // Compare audio files
  const compareAudioFiles = useCallback(() => {
    if (!audioRef.current || !concatenatedAudioRef.current) {
      setComparisonResult('Audio players not initialized');
      return;
    }

    const directDuration = audioRef.current.duration;
    const concatenatedDuration = concatenatedAudioRef.current.duration;
    const durationDiff = Math.abs(directDuration - concatenatedDuration);

    let result = `Direct audio duration: ${directDuration.toFixed(2)}s\n`;
    result += `Concatenated audio duration: ${concatenatedDuration.toFixed(2)}s\n`;
    result += `Difference: ${durationDiff.toFixed(2)}s (${((durationDiff / directDuration) * 100).toFixed(1)}%)\n`;

    if (durationDiff > 0.5) {
      result += `\nSignificant difference detected! This suggests the concatenated version has issues.`;
    } else {
      result += `\nDurations match closely. If audio sounds duplicated in one version but not the other, the issue is in the audio data construction.`;
    }

    setComparisonResult(result);
    addLog(result);
  }, [addLog]);

  // Play/pause uncompressed WAV (web only)
  const handlePlayUncompressedAudio = useCallback(() => {
    if (!uncompressedAudioUrl || !isWeb) return;

    try {
      if (!uncompressedAudioRef.current) {
        addLog('Creating new audio element for uncompressed WAV');
        uncompressedAudioRef.current = new Audio(uncompressedAudioUrl);

        // Add event listeners
        uncompressedAudioRef.current.addEventListener('play', () => {
          addLog('Uncompressed audio playback started');
          setIsPlayingUncompressed(true);
        });

        uncompressedAudioRef.current.addEventListener('pause', () => {
          addLog('Uncompressed audio playback paused');
          setIsPlayingUncompressed(false);
        });

        uncompressedAudioRef.current.addEventListener('ended', () => {
          addLog('Uncompressed audio playback ended');
          setIsPlayingUncompressed(false);
        });

        uncompressedAudioRef.current.addEventListener('error', (e) => {
          const errorMsg = (e.target as HTMLAudioElement).error?.message || 'Unknown error';
          addLog(`Uncompressed audio playback error: ${errorMsg}`);
          setError(`Uncompressed playback error: ${errorMsg}`);
          setIsPlayingUncompressed(false);
        });

        uncompressedAudioRef.current.addEventListener('loadedmetadata', () => {
          addLog(`Uncompressed audio duration: ${uncompressedAudioRef.current?.duration} seconds`);
        });
      }

      if (isPlayingUncompressed) {
        uncompressedAudioRef.current.pause();
      } else {
        uncompressedAudioRef.current.currentTime = 0; // Start from beginning
        uncompressedAudioRef.current.play().catch(err => {
          addLog(`Uncompressed play error: ${err.message}`);
          setError(`Uncompressed play error: ${err.message}`);
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error handling uncompressed audio: ${errorMessage}`);
      setError(`Uncompressed audio error: ${errorMessage}`);
    }
  }, [uncompressedAudioUrl, isPlayingUncompressed, isWeb, addLog]);

  // Add a button to the controls section 
  // Find the playback controls section and add this button after the "Compare Audio Files" button
  // Inside component, add this function to call the above utility
  const handleCompareWaveforms = useCallback(() => {
    if (audioUrl && concatenatedAudioUrl) {
      compareAudioWaveforms(
        audioUrl, 
        concatenatedAudioUrl, 
        addLog, 
        setComparisonResult
      );
    } else {
      addLog('Cannot compare waveforms: Missing audio URLs');
    }
  }, [audioUrl, concatenatedAudioUrl, addLog]);

  return (
    <ScreenWrapper
      withScrollView
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>Web Audio Recording Test</Text>
      <Text style={styles.subtitle}>Debug tool to detect duplicate chunks in web recording</Text>

      {error && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>{error}</Text>
          </Card.Content>
          <Card.Actions>
            <Button onPress={() => setError(null)}>Clear Error</Button>
          </Card.Actions>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Title title="Recording Status" />
        <Card.Content>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>
              {isRecording
                ? (isPaused ? 'Paused' : 'Recording')
                : (audioUrl ? 'Recorded' : 'Ready')}
            </Text>
          </View>

          {isRecording && (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.label}>Duration:</Text>
                <Text style={styles.value}>{formatTime(durationMs)}</Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.label}>Size:</Text>
                <Text style={styles.value}>{formatBytes(size)}</Text>
              </View>

              {compression && (
                <View style={styles.statusRow}>
                  <Text style={styles.label}>Compression:</Text>
                  <Text style={styles.value}>
                    {compression.format} ({compression.bitrate / 1000}kbps)
                  </Text>
                </View>
              )}

              <View style={styles.statusRow}>
                <Text style={styles.label}>Chunks:</Text>
                <Text style={styles.value}>{audioChunks.length}</Text>
              </View>
            </>
          )}

          {audioUrl && (
            <View style={styles.statusRow}>
              <Text style={styles.label}>Direct URL:</Text>
              <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
                {audioUrl}
              </Text>
            </View>
          )}

          {concatenatedAudioUrl && (
            <View style={styles.statusRow}>
              <Text style={styles.label}>Concat URL:</Text>
              <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
                {concatenatedAudioUrl}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <View style={styles.controls}>
        {!isRecording ? (
          <Button
            mode="contained"
            onPress={handleStartRecording}
            disabled={isRecording}
          >
            Start Direct Recording
          </Button>
        ) : (
          <View style={styles.recordingControls}>
            <Button
              mode="outlined"
              onPress={isPaused ? resumeRecording : pauseRecording}
              style={styles.controlButton}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>

            <Button
              mode="contained"
              onPress={handleStopRecording}
              buttonColor="#FF5252"
              style={styles.controlButton}
            >
              Stop Recording
            </Button>
          </View>
        )}

        {isWeb && audioUrl && !isRecording && (
          <View style={styles.playbackSection}>
            <Text style={styles.sectionTitle}>Audio Playback Comparison</Text>

            <View style={styles.playbackControls}>
              <Button
                mode="contained"
                onPress={handlePlayAudio}
                style={styles.playButton}
                buttonColor="#4CAF50"
              >
                {isPlaying ? 'Stop Direct Audio' : 'Play Direct Audio'}
              </Button>

              {uncompressedAudioUrl && (
                <Button
                  mode="contained"
                  onPress={handlePlayUncompressedAudio}
                  style={styles.playButton}
                  buttonColor="#FF9800"
                >
                  {isPlayingUncompressed ? 'Stop Uncompressed Audio' : 'Play Uncompressed Audio'}
                </Button>
              )}

              {concatenatedAudioUrl && (
                <>
                  <Button
                    mode="contained"
                    onPress={handlePlayConcatenatedAudio}
                    style={styles.playButton}
                    buttonColor="#2196F3"
                  >
                    {isPlayingConcatenated ? 'Stop Concatenated Audio' : 'Play Concatenated Audio'}
                  </Button>

                  <Button
                    mode="outlined"
                    onPress={compareAudioFiles}
                    style={styles.playButton}
                  >
                    Compare Audio Files
                  </Button>

                  <Button
                    mode="outlined"
                    onPress={handleCompareWaveforms}
                    style={styles.playButton}
                  >
                    Compare Audio Waveforms
                  </Button>
                </>
              )}

              {pcmChunks.length > 1 && (
                <Button
                  mode="outlined"
                  onPress={analyzePcmChunks}
                  style={styles.playButton}
                  buttonColor="#673AB7"
                >
                  Analyze PCM Chunks
                </Button>
              )}
            </View>

            {/* Summary info card */}
            <Card style={styles.infoCard}>
              <Card.Content>
                <Text style={styles.infoTitle}>Recording Summary:</Text>
                <Text style={styles.infoText}>PCM chunks: {pcmChunks.length}</Text>
                <Text style={styles.infoText}>Compressed chunks: {audioChunks.length}</Text>
                {uncompressedAudioUrl && uncompressedAudioRef.current?.duration && (
                  <Text style={styles.infoText}>
                    Uncompressed duration: {uncompressedAudioRef.current.duration.toFixed(2)}s
                  </Text>
                )}
                {audioRef.current?.duration && (
                  <Text style={styles.infoText}>
                    Direct audio duration: {audioRef.current.duration.toFixed(2)}s
                  </Text>
                )}
                {concatenatedAudioRef.current?.duration && (
                  <Text style={styles.infoText}>
                    Concatenated duration: {concatenatedAudioRef.current.duration.toFixed(2)}s
                  </Text>
                )}
              </Card.Content>
            </Card>

            {comparisonResult && (
              <Card style={styles.comparisonCard}>
                <Card.Content>
                  <Text style={styles.comparisonText}>
                    {comparisonResult.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < comparisonResult.split('\n').length - 1 && <Text>{'\n'}</Text>}
                      </React.Fragment>
                    ))}
                  </Text>
                </Card.Content>
              </Card>
            )}
          </View>
        )}
      </View>

      <Card style={styles.logCard}>
        <Card.Title title="Debug Logs" />
        <Card.Content>
          <ScrollView style={styles.logs}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logEntry}>{log}</Text>
            ))}
          </ScrollView>
        </Card.Content>
        <Card.Actions>
          <Button onPress={() => setLogs([])}>Clear Logs</Button>
        </Card.Actions>
      </Card>

    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
    width: 100,
  },
  value: {
    flex: 1,
  },
  controls: {
    marginBottom: 16,
    gap: 16,
  },
  recordingControls: {
    flexDirection: 'row',
    gap: 16,
  },
  controlButton: {
    flex: 1,
  },
  playbackSection: {
    marginTop: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  playbackControls: {
    gap: 12,
  },
  playButton: {
    width: '100%',
  },
  comparisonCard: {
    backgroundColor: '#E8F5E9',
    marginTop: 8,
  },
  comparisonText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
  },
  logCard: {
    flex: 1,
  },
  logs: {
    maxHeight: 200,
  },
  logEntry: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#FFF9C4',
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
  },
}); 