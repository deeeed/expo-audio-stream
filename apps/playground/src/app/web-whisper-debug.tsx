/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

// Minimal debug page for audio extraction and transcription
export default function WebWhisperDebugPage() {
  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedAudio, setExtractedAudio] = useState<Float32Array | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Refs
  const workerRef = useRef<Worker | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Initialize worker
  useEffect(() => {
    try {
      const worker = new Worker('/whisperWorker.js');
      
      worker.onmessage = (event) => {
        const message = event.data;
        
        switch (message.status) {
          case 'complete':
            setIsTranscribing(false);
            setTranscript(message.data.text);
            break;
          case 'ready':
            console.log('Worker ready');
            break;
          case 'error':
            console.error(`Error: ${message.data.message}`);
            setIsTranscribing(false);
            break;
        }
      };
      
      worker.postMessage({
        type: 'initialize',
        model: 'Xenova/whisper-tiny',
        quantized: true,
        multilingual: false
      });
      
      workerRef.current = worker;
      
      return () => {
        worker.terminate();
      };
    } catch (error) {
      console.error('Worker initialization error', error);
    }
  }, []);
  
  // File selection handler
  const handleFileSelection = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
      });

      if (!result.canceled && result.assets?.[0]) {
        const { uri, name } = result.assets[0];
        
        // Log the URI for comparison
        console.log('Selected file URI:', uri);
        
        // Fetch the file and log its first few bytes
        const response = await fetch(uri);
        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        const firstBytes = new Uint8Array(buffer.slice(0, 32));
        console.log('First 32 bytes:', Array.from(firstBytes));
        
        setSelectedFile(new File([blob], name, {
          type: 'audio/*',
        }));
        setExtractedAudio(null);
        setTranscript('');
      }
    } catch (error) {
      console.error('File selection error:', error);
    }
  }, []);
  
  // Extract first 10 seconds of audio
  const extractAudio = useCallback(async (fullFile = false) => {
    if (!selectedFile) {
      console.log('No file selected');
      return;
    }
    
    try {
      // Log the input file details
      console.log('Input file:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
      });

      // Create AudioContext if not exists
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || 
          (window as any).webkitAudioContext;
        
        audioContextRef.current = new AudioContextClass();
      }
      
      // Read file as ArrayBuffer and log its size
      const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            console.log('Raw buffer size:', reader.result.byteLength);
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
      
      const audioBuffer = await ctx.decodeAudioData(buffer);
      
      // Extract audio (either first 10 seconds or full file)
      const durationToExtract = fullFile ? audioBuffer.duration : Math.min(10, audioBuffer.duration);
      
      console.log(`Audio buffer - channels: ${audioBuffer.numberOfChannels} - sampleRate: ${audioBuffer.sampleRate} - duration: ${audioBuffer.duration}`)
      // print nu,ber of samples
      console.log(`Number of samples: ${audioBuffer.length}`)
      // Mix channels properly
      let audio;
      if (audioBuffer.numberOfChannels === 2) {
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        
        // Only extract the segment we want
        const samplesCount = Math.floor(durationToExtract * audioBuffer.sampleRate);
        audio = new Float32Array(samplesCount);
        for (let i = 0; i < samplesCount; ++i) {
          audio[i] = (left[i] + right[i]) / 2;
        }
      } else {
        // If the audio is not stereo, we can just use the first channel
        const samplesCount = Math.floor(durationToExtract * audioBuffer.sampleRate);
        audio = audioBuffer.getChannelData(0).slice(0, samplesCount);
      }
      
      // Resample to 16kHz if needed
      let finalAudio = audio;
      if (audioBuffer.sampleRate !== 16000) {
        // Create an offline context for resampling
        const offlineCtx = new OfflineAudioContext(
          1, // mono
          Math.floor(audio.length * 16000 / audioBuffer.sampleRate),
          16000 // 16kHz
        );
        
        // Create a buffer with the mixed audio
        const segmentBuffer = ctx.createBuffer(1, audio.length, audioBuffer.sampleRate);
        console.log(`Segment buffer: samples=${segmentBuffer.length}`);
        
        // For stereo to mono conversion, use the same scaling factor as ExpoAudioStreamModule
        const SCALING_FACTOR = Math.sqrt(2);
        const channelData = segmentBuffer.getChannelData(0);
        
        if (audioBuffer.numberOfChannels === 2) {
          // Apply the same stereo to mono mixing with scaling factor
          const left = audioBuffer.getChannelData(0);
          const right = audioBuffer.getChannelData(1);
          for (let i = 0; i < audio.length; i++) {
            channelData[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2;
          }
        } else {
          // For mono, just copy with scaling
          const sourceData = audioBuffer.getChannelData(0);
          for (let i = 0; i < audio.length; i++) {
            channelData[i] = sourceData[i];
          }
        }
        
        // Create source and connect
        const source = offlineCtx.createBufferSource();
        source.buffer = segmentBuffer;
        source.connect(offlineCtx.destination);
        
        // Start the source and render
        source.start();
        const resampledBuffer = await offlineCtx.startRendering();
        
        // Get the resampled audio data
        finalAudio = resampledBuffer.getChannelData(0) as Float32Array<ArrayBuffer>;
        
        // Calculate amplitude statistics to match whisper.tsx logs
        let maxAmplitude = 0;
        let sumAmplitude = 0;
        let samplesAbove50Percent = 0;
        
        for (let i = 0; i < finalAudio.length; i++) {
          const absValue = Math.abs(finalAudio[i]);
          maxAmplitude = Math.max(maxAmplitude, absValue);
          sumAmplitude += absValue;
          if (absValue > 0.5) samplesAbove50Percent++;
        }
        
        const avgAmplitude = sumAmplitude / finalAudio.length;
        
        console.log('[audio-playground:whisper] Audio amplitude validation:', {
          maxAmplitude,
          avgAmplitude,
          hasSignal: maxAmplitude > 0,
          isAmplified: maxAmplitude >= 0.5,
          samplesAbove50Percent,
          totalSamples: finalAudio.length
        });
      }

      // Add detailed analysis of the audio data
      const stats = {
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
        absMax: 0,
        rms: 0,
        samples: finalAudio.length,
        sampleRate: 16000,
        duration: finalAudio.length / 16000,
        firstSamples: Array.from(finalAudio.slice(0, 10)), // First 10 samples
        lastSamples: Array.from(finalAudio.slice(-10)) // Last 10 samples
      };

      for (let i = 0; i < finalAudio.length; i++) {
        const sample = finalAudio[i];
        stats.min = Math.min(stats.min, sample);
        stats.max = Math.max(stats.max, sample);
        stats.absMax = Math.max(stats.absMax, Math.abs(sample));
        stats.rms += sample * sample;
      }
      stats.rms = Math.sqrt(stats.rms / finalAudio.length);

      console.log('Final audio statistics:', {
        sampleRate: 16000,
        channels: 1,
        samples: finalAudio.length,
        duration: finalAudio.length / 16000,
        stats
      });

      // Log initial extraction options
      console.log('[audio-playground:whisper] Extract audio options:', {
        fileUri: selectedFile.name,
        includeBase64Data: true,
        includeNormalizedData: true,
        includeWavHeader: false,
        startTimeMs: 0,
        endTimeMs: durationToExtract * 1000,
        decodingOptions: {
          targetSampleRate: 16000,
          targetChannels: 1,
          targetBitDepth: 16,
          normalizeAudio: true,
        }
      });

      // Log initial audio buffer details
      console.log('[audio-playground:whisper] EXTRACT AUDIO - Step 1.5: Audio buffer details', {
        channels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration,
        length: audioBuffer.length
      });

      // Log final output details
      console.log('[audio-playground:whisper] EXTRACT AUDIO - Step 4: Final output', {
        pcmData: {
          length: finalAudio.length,
          sampleRate: 16000,
          channels: 1
        },
        timing: {
          duration: finalAudio.length / 16000
        }
      });

      // Store the extracted audio
      setExtractedAudio(finalAudio);
      
    } catch (error) {
      console.error('Audio extraction error:', error);
    }
  }, [selectedFile]);
  
  // Transcribe function
  const transcribe = useCallback(async () => {
    if (!extractedAudio || !workerRef.current) {
      console.log('No extracted audio or worker not ready');
      return;
    }
    
    try {
      setIsTranscribing(true);
      setTranscript('');
      
      const jobId = `debug_${Date.now()}`;

      const action = {
          type: 'transcribe',
          audio: extractedAudio,
          jobId,
          model: 'Xenova/whisper-tiny',
          multilingual: true,
          quantized: true,
          language: null,
          // options: {
          //   task: 'transcribe',
          //   without_timestamps: true
          // }
      }

      console.log('Sending to worker:', action);
      
      // Send message to worker
      workerRef.current.postMessage(action);
      
    } catch (error) {
      console.error('Transcription error:', error);
      setIsTranscribing(false);
    }
  }, [extractedAudio]);
  
  return (
    <View>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Whisper Debug (Minimal)
      </Text>
      
      {/* File Selection */}
      <View style={{ marginBottom: 20 }}>
        <Button 
          title="Select Audio File" 
          onPress={handleFileSelection} 
          disabled={isTranscribing}
        />
        {selectedFile && (
          <Text>
            Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)
          </Text>
        )}
      </View>
      
      {/* Audio Extraction */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button 
            title="Extract First 10s" 
            onPress={() => extractAudio(false)} 
            disabled={!selectedFile || isTranscribing}
          />
          <Button 
            title="Extract Full File" 
            onPress={() => extractAudio(true)} 
            disabled={!selectedFile || isTranscribing}
          />
        </View>
        {extractedAudio && (
          <Text>
            Extracted: {extractedAudio.length} samples ({(extractedAudio.length / 16000).toFixed(2)}s)
          </Text>
        )}
      </View>
      
      {/* Transcription */}
      <View style={{ marginBottom: 20 }}>
        <Button 
          title={isTranscribing ? "Transcribing..." : "Transcribe"} 
          onPress={transcribe} 
          disabled={!extractedAudio || isTranscribing}
        />
      </View>
      
      {/* Transcript */}
      {transcript ? (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontWeight: 'bold' }}>Transcript:</Text>
          <Text>{transcript}</Text>
        </View>
      ) : null}
    </View>
  );
} 