/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

// Minimal debug page for audio extraction and transcription
export default function WhisperDebugPage() {
  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedAudio, setExtractedAudio] = useState<Float32Array | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  
  // Refs
  const workerRef = useRef<Worker | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Logger function
  const log = useCallback((message: string, data?: any) => {
    console.log(message, data);
    setLogs(prev => [...prev, `${new Date().toISOString().slice(11, 23)} - ${message}${data ? ': ' + JSON.stringify(data) : ''}`]);
  }, []);
  
  // Initialize worker
  useEffect(() => {
    // Create worker
    try {
      const worker = new Worker('/whisperWorker.js');
      
      // Set up message handler
      worker.onmessage = (event) => {
        const message = event.data;
        
        switch (message.status) {
          case 'progress':
            setProgress(message.progress);
            break;
          case 'update': {
            const text = message.data[0];
            log(`Received update: ${text.substring(0, 50)}...`);
            break;
          }
          case 'complete':
            setIsTranscribing(false);
            setTranscript(message.data.text);
            log('Transcription complete');
            break;
          case 'ready':
            log('Worker ready');
            break;
          case 'error':
            log(`Error: ${message.data.message}`);
            setIsTranscribing(false);
            break;
          default:
            log(`Unknown message: ${message.status}`, message.data);
        }
      };
      
      // Initialize worker
      worker.postMessage({
        type: 'initialize',
        model: 'Xenova/whisper-tiny',
        quantized: true,
        multilingual: false
      });
      
      workerRef.current = worker;
      
      // Cleanup
      return () => {
        worker.terminate();
      };
    } catch (error) {
      log('Worker initialization error', error instanceof Error ? error.message : String(error));
    }
  }, [log]);
  
  // File selection handler
  const handleFileSelection = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      
      log(`Selected file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      setSelectedFile(file);
      setExtractedAudio(null);
      setTranscript('');
    };
    
    input.click();
  }, [log]);

    
    // Helper function to analyze audio
    const analyzeAudio = useCallback((audio: Float32Array) => {
        const stats = {
          length: audio.length,
          duration: audio.length / 16000,
          nonZeroSamples: 0,
          maxAmplitude: 0,
          minAmplitude: 0,
          avgAmplitude: 0,
          rms: 0
        };
        
        let sum = 0;
        let sumSquares = 0;
        
        stats.minAmplitude = Number.MAX_VALUE;
        
        for (let i = 0; i < audio.length; i++) {
          const value = audio[i];
          const absValue = Math.abs(value);
          
          if (value !== 0) stats.nonZeroSamples++;
          
          stats.maxAmplitude = Math.max(stats.maxAmplitude, absValue);
          stats.minAmplitude = Math.min(stats.minAmplitude, absValue);
          
          sum += absValue;
          sumSquares += value * value;
        }
        
        stats.avgAmplitude = sum / audio.length;
        stats.rms = Math.sqrt(sumSquares / audio.length);
        
        return stats;
      }, []);
  
  
  // Extract audio function
  const extractAudio = useCallback(async () => {
    if (!selectedFile) {
      log('No file selected');
      return;
    }
    
    try {
      log('Starting audio extraction using improved method');
      
      // Create AudioContext if not exists
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || 
          (window as any).webkitAudioContext;
        
        audioContextRef.current = new AudioContextClass();
      }
      
      // Read file as ArrayBuffer
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(reader.result);
          } else {
            reject(new Error('Expected ArrayBuffer from FileReader'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(selectedFile);
      });
      
      // Decode audio
      const ctx = audioContextRef.current;
      if (!ctx) {
        throw new Error('AudioContext not initialized');
      }
      
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      log(`Audio decoded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels} channels, ${audioBuffer.sampleRate}Hz`);
      
      // Extract first 10 seconds (or less if file is shorter)
      const durationToExtract = Math.min(10, audioBuffer.duration);
      
      // Mix channels properly
      let audio;
      if (audioBuffer.numberOfChannels === 2) {
        const SCALING_FACTOR = Math.sqrt(2);
        
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        
        // Only extract the segment we want
        const samplesCount = Math.floor(durationToExtract * audioBuffer.sampleRate);
        audio = new Float32Array(samplesCount);
        for (let i = 0; i < samplesCount; ++i) {
          audio[i] = SCALING_FACTOR * (left[i] + right[i]) / 2;
        }
        
        log('Mixed stereo channels to mono with proper scaling');
      } else {
        // If the audio is not stereo, we can just use the first channel
        const samplesCount = Math.floor(durationToExtract * audioBuffer.sampleRate);
        audio = audioBuffer.getChannelData(0).slice(0, samplesCount);
        log('Using mono channel directly');
      }
      
      // Resample to 16kHz if needed
      let finalAudio = audio;
      if (audioBuffer.sampleRate !== 16000) {
        log(`Resampling from ${audioBuffer.sampleRate}Hz to 16000Hz`);
        
        // Create an offline context for resampling
        const offlineCtx = new OfflineAudioContext(
          1, // mono
          Math.floor(audio.length * 16000 / audioBuffer.sampleRate),
          16000 // 16kHz
        );
        
        // Create a buffer with the mixed audio
        const buffer = ctx.createBuffer(1, audio.length, audioBuffer.sampleRate);
        buffer.getChannelData(0).set(audio);
        
        // Create source and connect
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(offlineCtx.destination);
        
        // Start the source and render
        source.start();
        const resampledBuffer = await offlineCtx.startRendering();
        
        // Get the resampled audio data
        finalAudio = resampledBuffer.getChannelData(0) as Float32Array<ArrayBuffer>;
        log(`Resampled to ${finalAudio.length} samples at 16kHz`);
      }
      
      // Store the extracted audio
      setExtractedAudio(finalAudio);
      
      // Analyze audio
      const audioStats = analyzeAudio(finalAudio);
      log('Processed audio stats:', audioStats);
      
      log(`Successfully extracted ${durationToExtract.toFixed(2)}s of audio (${finalAudio.length} samples)`);
      
    } catch (error) {
      log(`Audio extraction error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [selectedFile, log, analyzeAudio]);

      
  // Add function to play extracted audio
  const playExtractedAudio = useCallback(() => {
    if (!extractedAudio) {
      log('No extracted audio to play');
      return;
    }
    
    try {
      // Create AudioContext if not exists
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || 
          (window as any).webkitAudioContext;
        
        audioContextRef.current = new AudioContextClass({
          sampleRate: 16000,
        });
      }
      
      const ctx = audioContextRef.current;
      if (!ctx) {
        throw new Error('AudioContext not initialized');
      }
      
      // Create a buffer with the extracted audio
      const buffer = ctx.createBuffer(1, extractedAudio.length, 16000);
      const channelData = buffer.getChannelData(0);
      
      // Copy the data
      for (let i = 0; i < extractedAudio.length; i++) {
        channelData[i] = extractedAudio[i];
      }
      
      // Create source and play
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
      
      log('Playing extracted audio...');
    } catch (error) {
      log(`Error playing audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [extractedAudio, log]);
  
  // Transcribe function
  const transcribe = useCallback(async () => {
    if (!extractedAudio || !workerRef.current) {
      log('No extracted audio or worker not ready');
      return;
    }
    
    try {
      setIsTranscribing(true);
      setProgress(0);
      setTranscript('');
      
      const jobId = `debug_${Date.now()}`;
      log(`Starting transcription, jobId: ${jobId}`);
      
      // Log audio stats before sending to worker
      const audioStats = analyzeAudio(extractedAudio);
      log('Audio stats before sending to worker:', audioStats);
      
      // Send message to worker with the WORKING parameters from mixChannelsAndTranscribe
      workerRef.current.postMessage({
        type: 'transcribe',
        audio: extractedAudio,
        jobId,
        model: 'Xenova/whisper-tiny',
        multilingual: false,  // Changed from false to true
        quantized: false,
        language: null,      // Changed from 'en' to null (auto-detect)
        options: {
          task: 'transcribe',
          without_timestamps: false  // Simplified timestamp options
        }
      });
      
    } catch (error) {
      log(`Transcription error: ${error instanceof Error ? error.message : String(error)}`);
      setIsTranscribing(false);
    }
  }, [analyzeAudio, extractedAudio, log]);
  

  // Add function to try different model
  const transcribeWithDifferentModel = useCallback(async () => {
    if (!extractedAudio || !workerRef.current) {
      log('No extracted audio or worker not ready');
      return;
    }
    
    try {
      setIsTranscribing(true);
      setProgress(0);
      setTranscript('');
      
      const jobId = `debug_alt_${Date.now()}`;
      log(`Starting transcription with base model, jobId: ${jobId}`);
      
      // Send message to worker with different model
      workerRef.current.postMessage({
        type: 'transcribe',
        audio: extractedAudio,
        jobId,
        model: 'Xenova/whisper-base',  // Try a larger model
        multilingual: false,
        quantized: true,
        language: 'en',
        options: {
          language: 'en',
          tokenTimestamps: true,
        }
      });
      
    } catch (error) {
      log(`Transcription error: ${error instanceof Error ? error.message : String(error)}`);
      setIsTranscribing(false);
    }
  }, [extractedAudio, log]);
  
  // Add function to normalize audio
  const normalizeAndTranscribe = useCallback(async () => {
    if (!extractedAudio || !workerRef.current) {
      log('No extracted audio or worker not ready');
      return;
    }
    
    try {
      // Normalize the audio
      log('Normalizing audio before transcription');
      const normalizedAudio = new Float32Array(extractedAudio.length);
      
      // Find the maximum amplitude
      let maxAmplitude = 0;
      for (let i = 0; i < extractedAudio.length; i++) {
        maxAmplitude = Math.max(maxAmplitude, Math.abs(extractedAudio[i]));
      }
      
      // Normalize to 0.95 amplitude
      const normalizationFactor = maxAmplitude > 0 ? 0.95 / maxAmplitude : 1;
      for (let i = 0; i < extractedAudio.length; i++) {
        normalizedAudio[i] = extractedAudio[i] * normalizationFactor;
      }
      
      // Log stats of normalized audio
      const audioStats = analyzeAudio(normalizedAudio);
      log('Normalized audio stats:', audioStats);
      
      setIsTranscribing(true);
      setProgress(0);
      setTranscript('');
      
      const jobId = `debug_norm_${Date.now()}`;
      log(`Starting transcription with normalized audio, jobId: ${jobId}`);
      
      // Send message to worker
      workerRef.current.postMessage({
        type: 'transcribe',
        audio: normalizedAudio,
        jobId,
        model: 'Xenova/whisper-tiny',
        multilingual: false,
        quantized: true,
        language: 'en',
        options: {
          language: 'en',
          tokenTimestamps: true,
        }
      });
      
    } catch (error) {
      log(`Normalization/transcription error: ${error instanceof Error ? error.message : String(error)}`);
      setIsTranscribing(false);
    }
  }, [extractedAudio, log, analyzeAudio]);
  
  // Add function to extract shorter audio segment
  const extractShorterAudio = useCallback(async () => {
    if (!selectedFile) {
      log('No file selected');
      return;
    }
    
    try {
      log('Starting shorter audio extraction (3 seconds)');
      
      // Create AudioContext if not exists
      if (!audioContextRef.current) {
        // Handle webkit prefix for Safari
        const AudioContextClass = window.AudioContext || 
          (window as any).webkitAudioContext;
        
        audioContextRef.current = new AudioContextClass({
          sampleRate: 16000, // Whisper expects 16kHz
        });
      }
      
      // Read file as ArrayBuffer
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(reader.result);
          } else {
            reject(new Error('Expected ArrayBuffer from FileReader'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(selectedFile);
      });
      
      // Decode audio
      const ctx = audioContextRef.current;
      if (!ctx) {
        throw new Error('AudioContext not initialized');
      }
      
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      
      // Extract first 3 seconds (or less if file is shorter)
      const durationToExtract = Math.min(3, audioBuffer.duration);
      const samplesToExtract = Math.floor(durationToExtract * 16000); // 16kHz target rate
      
      // Create offline context for resampling
      const offlineCtx = new OfflineAudioContext(
        1, // mono
        samplesToExtract,
        16000 // 16kHz
      );
      
      // Create source buffer with the exact segment we want
      const segmentBuffer = ctx.createBuffer(
        audioBuffer.numberOfChannels,
        Math.min(audioBuffer.length, Math.floor(durationToExtract * audioBuffer.sampleRate)),
        audioBuffer.sampleRate
      );
      
      // Copy the segment data
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const segmentChannelData = segmentBuffer.getChannelData(channel);
        const length = segmentChannelData.length;
        
        segmentChannelData.set(channelData.subarray(0, length));
      }
      
      // Create source and connect
      const source = offlineCtx.createBufferSource();
      source.buffer = segmentBuffer;
      source.connect(offlineCtx.destination);
      
      // Start the source and render
      source.start();
      const processedBuffer = await offlineCtx.startRendering();
      
      // Get the processed audio data
      const channelData = processedBuffer.getChannelData(0);
      
      // Validate audio
      const audioStats = analyzeAudio(channelData);
      log('Shorter audio stats:', audioStats);
      
      // Store the extracted audio
      setExtractedAudio(channelData);
      log(`Successfully extracted ${durationToExtract.toFixed(2)}s of audio (${channelData.length} samples)`);
      
    } catch (error) {
      log(`Shorter audio extraction error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [selectedFile, log, analyzeAudio]);
  
  // Add function to try with different parameters
  const transcribeWithAdvancedOptions = useCallback(async () => {
    if (!extractedAudio || !workerRef.current) {
      log('No extracted audio or worker not ready');
      return;
    }
    
    try {
      setIsTranscribing(true);
      setProgress(0);
      setTranscript('');
      
      const jobId = `debug_adv_${Date.now()}`;
      log(`Starting transcription with advanced options, jobId: ${jobId}`);
      
      // Try with different parameters that might help with transcription
      workerRef.current.postMessage({
        type: 'transcribe',
        audio: extractedAudio,
        jobId,
        model: 'Xenova/whisper-tiny',
        multilingual: true, // Try with multilingual enabled
        quantized: true,
        language: null, // Let the model detect language
        options: {
          language: null,
          task: 'transcribe',
          beam_size: 5,
          best_of: 5,
          temperature: 0,
          compression_ratio_threshold: 2.4,
          logprob_threshold: -1,
          no_speech_threshold: 0.6, // Try a higher threshold
          condition_on_previous_text: false,
          prompt: "The following is a transcript of speech audio.",
          suppress_tokens: [-1],
          without_timestamps: true,
          max_initial_timestamp: 1.0
        }
      });
      
    } catch (error) {
      log(`Advanced transcription error: ${error instanceof Error ? error.message : String(error)}`);
      setIsTranscribing(false);
    }
  }, [extractedAudio, log]);
  
  // Add function to try with larger model
  const transcribeWithLargerModel = useCallback(async () => {
    if (!extractedAudio || !workerRef.current) {
      log('No extracted audio or worker not ready');
      return;
    }
    
    try {
      setIsTranscribing(true);
      setProgress(0);
      setTranscript('');
      
      const jobId = `debug_large_${Date.now()}`;
      log(`Starting transcription with larger model, jobId: ${jobId}`);
      
      // Try with a larger model
      workerRef.current.postMessage({
        type: 'transcribe',
        audio: extractedAudio,
        jobId,
        model: 'Xenova/whisper-small', // Try small model instead of tiny
        multilingual: true,
        quantized: true,
        language: null, // Let the model detect language
        options: {
          language: null,
          task: 'transcribe',
          without_timestamps: true
        }
      });
      
    } catch (error) {
      log(`Larger model transcription error: ${error instanceof Error ? error.message : String(error)}`);
      setIsTranscribing(false);
    }
  }, [extractedAudio, log]);
  
  // Add function to debug worker
  const debugWorker = useCallback(() => {
    if (!workerRef.current) {
      log('Worker not initialized');
      return;
    }
    
    try {
      log('Sending debug command to worker');
      
      // Send debug command to worker
      workerRef.current.postMessage({
        type: 'debug',
        command: 'status'
      });
      
    } catch (error) {
      log(`Worker debug error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [log]);
  
  // Add function to check for worker errors
  const checkWorkerErrors = useCallback(() => {
    if (!workerRef.current) {
      log('Worker not initialized');
      return;
    }
    
    try {
      log('Checking worker for errors');
      
      // Reinitialize worker
      workerRef.current.postMessage({
        type: 'initialize',
        model: 'Xenova/whisper-tiny',
        quantized: true,
        multilingual: false,
        debug: true
      });
      
    } catch (error) {
      log(`Worker check error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [log]);
  
  // Add function to properly mix audio channels and transcribe
  const mixChannelsAndTranscribe = useCallback(async () => {
    if (!selectedFile) {
      log('No file selected');
      return;
    }
    
    try {
      log('Starting audio extraction with proper channel mixing');
      
      // Create AudioContext if not exists
      if (!audioContextRef.current) {
        // Handle webkit prefix for Safari
        const AudioContextClass = window.AudioContext || 
          (window as any).webkitAudioContext;
        
        audioContextRef.current = new AudioContextClass();
      }
      
      // Read file as ArrayBuffer
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(reader.result);
          } else {
            reject(new Error('Expected ArrayBuffer from FileReader'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(selectedFile);
      });
      
      // Decode audio
      const ctx = audioContextRef.current;
      if (!ctx) {
        throw new Error('AudioContext not initialized');
      }
      
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      log(`Audio decoded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels} channels, ${audioBuffer.sampleRate}Hz`);
      
      // Mix channels properly
      let audio;
      if (audioBuffer.numberOfChannels === 2) {
        const SCALING_FACTOR = Math.sqrt(2);
        
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        
        audio = new Float32Array(left.length);
        for (let i = 0; i < audioBuffer.length; ++i) {
          audio[i] = SCALING_FACTOR * (left[i] + right[i]) / 2;
        }
        
        log('Mixed stereo channels to mono with proper scaling');
      } else {
        // If the audio is not stereo, we can just use the first channel
        audio = audioBuffer.getChannelData(0);
        log('Using mono channel directly');
      }
      
      // Resample to 16kHz if needed
      let finalAudio = audio;
      if (audioBuffer.sampleRate !== 16000) {
        log(`Resampling from ${audioBuffer.sampleRate}Hz to 16000Hz`);
        
        // Create an offline context for resampling
        const offlineCtx = new OfflineAudioContext(
          1, // mono
          Math.floor(audio.length * 16000 / audioBuffer.sampleRate),
          16000 // 16kHz
        );
        
        // Create a buffer with the mixed audio
        const buffer = ctx.createBuffer(1, audio.length, audioBuffer.sampleRate);
        buffer.getChannelData(0).set(audio);
        
        // Create source and connect
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(offlineCtx.destination);
        
        // Start the source and render
        source.start();
        const resampledBuffer = await offlineCtx.startRendering();
        
        // Get the resampled audio data
        finalAudio = resampledBuffer.getChannelData(0);
        log(`Resampled to ${finalAudio.length} samples at 16kHz`);
      }
      
      // Store the extracted audio for playback
      setExtractedAudio(finalAudio);
      
      // Analyze audio
      const audioStats = analyzeAudio(finalAudio);
      log('Processed audio stats:', audioStats);
      
      // Limit to 10 seconds for transcription if needed
      const limitedAudio = finalAudio.length > 160000 
        ? finalAudio.slice(0, 160000) 
        : finalAudio;
      
      if (limitedAudio.length < finalAudio.length) {
        log(`Limited audio to first 10 seconds (${limitedAudio.length} samples)`);
      }
      
      // Start transcription
      if (workerRef.current) {
        setIsTranscribing(true);
        setProgress(0);
        setTranscript('');
        
        const jobId = `debug_mixed_${Date.now()}`;
        log(`Starting transcription with properly mixed audio, jobId: ${jobId}`);
        
        // Send to worker using the approach from the example
        workerRef.current.postMessage({
          type: 'transcribe',
          audio: limitedAudio,
          jobId,
          model: 'Xenova/whisper-tiny',
          multilingual: true,
          quantized: true,
          language: null, // Let the model detect language
          options: {
            task: 'transcribe',
            without_timestamps: true
          }
        });
      }
      
    } catch (error) {
      log(`Channel mixing error: ${error instanceof Error ? error.message : String(error)}`);
      setIsTranscribing(false);
    }
  }, [selectedFile, log, analyzeAudio]);
  
  // Add function to try with a completely different approach
  const tryDirectFileTranscription = useCallback(async () => {
    if (!selectedFile || !workerRef.current) {
      log('No file selected or worker not ready');
      return;
    }
    
    try {
      log('Trying direct file transcription');
      
      setIsTranscribing(true);
      setProgress(0);
      setTranscript('');
      
      const jobId = `debug_direct_${Date.now()}`;
      log(`Starting direct file transcription, jobId: ${jobId}`);
      
      // Send the file directly to the worker
      workerRef.current.postMessage({
        type: 'transcribe_file',
        file: selectedFile,
        jobId,
        model: 'Xenova/whisper-tiny',
        multilingual: true,
        quantized: true,
        language: null,
        options: {
          task: 'transcribe',
          without_timestamps: true
        }
      });
      
    } catch (error) {
      log(`Direct file transcription error: ${error instanceof Error ? error.message : String(error)}`);
      setIsTranscribing(false);
    }
  }, [selectedFile, log]);
  
  // Add an optimized transcription function based on what worked
  const optimizedTranscribe = useCallback(async () => {
    if (!selectedFile) {
      log('No file selected');
      return;
    }
    
    try {
      log('Starting optimized transcription process');
      setIsTranscribing(true);
      setProgress(0);
      setTranscript('');
      
      // Create AudioContext if not exists
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || 
          (window as any).webkitAudioContext;
        
        audioContextRef.current = new AudioContextClass();
      }
      
      // Read file as ArrayBuffer
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(reader.result);
          } else {
            reject(new Error('Expected ArrayBuffer from FileReader'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(selectedFile);
      });
      
      // Decode audio
      const ctx = audioContextRef.current;
      if (!ctx) {
        throw new Error('AudioContext not initialized');
      }
      
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      log(`Audio decoded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels} channels, ${audioBuffer.sampleRate}Hz`);
      
      // Extract full audio with proper channel mixing
      let audio;
      if (audioBuffer.numberOfChannels === 2) {
        const SCALING_FACTOR = Math.sqrt(2);
        
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        
        audio = new Float32Array(left.length);
        for (let i = 0; i < audioBuffer.length; ++i) {
          audio[i] = SCALING_FACTOR * (left[i] + right[i]) / 2;
        }
        
        log('Mixed stereo channels to mono with proper scaling');
      } else {
        // If the audio is not stereo, we can just use the first channel
        audio = audioBuffer.getChannelData(0);
        log('Using mono channel directly');
      }
      
      // Resample to 16kHz if needed
      let finalAudio = audio;
      if (audioBuffer.sampleRate !== 16000) {
        log(`Resampling from ${audioBuffer.sampleRate}Hz to 16000Hz`);
        
        // Create an offline context for resampling
        const offlineCtx = new OfflineAudioContext(
          1, // mono
          Math.floor(audio.length * 16000 / audioBuffer.sampleRate),
          16000 // 16kHz
        );
        
        // Create a buffer with the mixed audio
        const buffer = ctx.createBuffer(1, audio.length, audioBuffer.sampleRate);
        buffer.getChannelData(0).set(audio);
        
        // Create source and connect
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(offlineCtx.destination);
        
        // Start the source and render
        source.start();
        const resampledBuffer = await offlineCtx.startRendering();
        
        // Get the resampled audio data
        finalAudio = resampledBuffer.getChannelData(0);
        log(`Resampled to ${finalAudio.length} samples at 16kHz`);
      }
      
      // Store the extracted audio for playback
      setExtractedAudio(finalAudio);
      
      // Analyze audio
      const audioStats = analyzeAudio(finalAudio);
      log('Processed audio stats:', audioStats);
      
      // Determine segment length based on audio duration
      // For longer audio, we'll process in chunks
      const maxSegmentLength = 30 * 16000; // 30 seconds at 16kHz
      const totalSegments = Math.ceil(finalAudio.length / maxSegmentLength);
      
      log(`Audio will be processed in ${totalSegments} segment(s)`);
      
      // Process first segment
      const firstSegment = finalAudio.length > maxSegmentLength 
        ? finalAudio.slice(0, maxSegmentLength) 
        : finalAudio;
      
      if (workerRef.current) {
        const jobId = `optimized_${Date.now()}`;
        log(`Starting transcription with optimized settings, jobId: ${jobId}`);
        
        // Send to worker with the settings that worked
        workerRef.current.postMessage({
          type: 'transcribe',
          audio: firstSegment,
          jobId,
          model: 'Xenova/whisper-tiny',
          multilingual: true,
          quantized: false,
          language: null, // Let the model detect language
          options: {
            task: 'transcribe',
            without_timestamps: false
          }
        });
      }
      
    } catch (error) {
      log(`Optimized transcription error: ${error instanceof Error ? error.message : String(error)}`);
      setIsTranscribing(false);
    }
  }, [selectedFile, log, analyzeAudio]);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Whisper Debug Page</Text>
      
      {/* File Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Select Audio File</Text>
        <Button 
          title="Select File" 
          onPress={handleFileSelection} 
          disabled={isTranscribing}
        />
        {selectedFile && (
          <Text style={styles.info}>
            Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)
          </Text>
        )}
      </View>
      
      {/* Audio Extraction */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Extract Audio</Text>
        <View style={styles.buttonRow}>
          <Button 
            title="Extract 10s" 
            onPress={extractAudio} 
            disabled={!selectedFile || isTranscribing}
          />
          <Button 
            title="Extract 3s" 
            onPress={extractShorterAudio} 
            disabled={!selectedFile || isTranscribing}
          />
        </View>
        <View style={styles.buttonRow}>
          <Button 
            title="Mix Channels & Extract" 
            onPress={mixChannelsAndTranscribe} 
            disabled={!selectedFile || isTranscribing}
          />
          <Button 
            title="Direct File Transcription" 
            onPress={tryDirectFileTranscription} 
            disabled={!selectedFile || isTranscribing}
          />
        </View>
        {extractedAudio && (
          <View style={styles.audioControls}>
            <Text style={styles.info}>
              Extracted: {extractedAudio.length} samples ({(extractedAudio.length / 16000).toFixed(2)}s)
            </Text>
            <Button
              title="Play Extracted Audio"
              onPress={playExtractedAudio}
              disabled={isTranscribing}
            />
          </View>
        )}
      </View>
      
      {/* Transcription */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Transcribe</Text>
        <Button 
          title={isTranscribing ? "Transcribing..." : "Start Transcription"} 
          onPress={transcribe} 
          disabled={!extractedAudio || isTranscribing}
        />
        {extractedAudio && !isTranscribing && (
          <View style={styles.troubleshootingButtons}>
            <Button 
              title="Try with Base Model" 
              onPress={transcribeWithDifferentModel} 
              disabled={isTranscribing}
            />
            <Button 
              title="Try with Small Model" 
              onPress={transcribeWithLargerModel} 
              disabled={isTranscribing}
            />
            <Button 
              title="Normalize & Transcribe" 
              onPress={normalizeAndTranscribe} 
              disabled={isTranscribing}
            />
            <Button 
              title="Advanced Options" 
              onPress={transcribeWithAdvancedOptions} 
              disabled={isTranscribing}
            />
          </View>
        )}
        {extractedAudio && !isTranscribing && (
          <View style={styles.debugButtons}>
            <Button 
              title="Debug Worker" 
              onPress={debugWorker} 
              disabled={isTranscribing}
            />
            <Button 
              title="Check Worker Errors" 
              onPress={checkWorkerErrors} 
              disabled={isTranscribing}
            />
          </View>
        )}
        {isTranscribing && (
          <View style={styles.progressContainer}>
            <Text>{Math.round(progress)}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
        )}
      </View>
      
      {/* Transcript */}
      {transcript ? (
        <View style={styles.transcriptContainer}>
          <Text style={styles.sectionTitle}>Transcript:</Text>
          <Text>{transcript}</Text>
        </View>
      ) : null}
      
      {/* Logs */}
      <View style={styles.logsContainer}>
        <Text style={styles.sectionTitle}>Debug Logs:</Text>
        <View style={styles.logs}>
          {logs.map((log, i) => (
            <Text key={i} style={styles.logLine}>{log}</Text>
          ))}
        </View>
      </View>
      
      {/* Main Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.buttonRow}>
          <Button 
            title="Select File" 
            onPress={handleFileSelection} 
            disabled={isTranscribing}
          />
          <Button 
            title={isTranscribing ? "Transcribing..." : "Optimized Transcribe"} 
            onPress={optimizedTranscribe} 
            disabled={!selectedFile || isTranscribing}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    maxWidth: 800,
    margin: 'auto',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  info: {
    marginTop: 10,
    fontStyle: 'italic',
  },
  progressContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    marginLeft: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 5,
  },
  transcriptContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#e6f7ff',
    borderRadius: 8,
  },
  logsContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  logs: {
    maxHeight: 200,
    overflow: 'scroll',
  },
  logLine: {
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 2,
  },
  audioControls: {
    marginTop: 10,
  },
  troubleshootingButtons: {
    marginTop: 10,
    gap: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  debugButtons: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
}); 