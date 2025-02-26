/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Text, View } from 'react-native';

// Minimal debug page for audio extraction and transcription
export default function WhisperDebugPage() {
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
  const handleFileSelection = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      
      setSelectedFile(file);
      setExtractedAudio(null);
      setTranscript('');
    };
    
    input.click();
  }, []);
  
  // Extract first 10 seconds of audio
  const extractAudio = useCallback(async (fullFile = false) => {
    if (!selectedFile) {
      console.log('No file selected');
      return;
    }
    
    try {
      // Create AudioContext if not exists
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || 
          (window as any).webkitAudioContext;
        
        audioContextRef.current = new AudioContextClass();
      }
      
      // Read file as ArrayBuffer
      const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
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

        console.log(`Segment buffer: samples=${segmentBuffer.length}`)
        segmentBuffer.getChannelData(0).set(audio);
        
        // Create source and connect
        const source = offlineCtx.createBufferSource();
        source.buffer = segmentBuffer;
        source.connect(offlineCtx.destination);
        
        // Start the source and render
        source.start();
        const resampledBuffer = await offlineCtx.startRendering();
        
        // Get the resampled audio data
        finalAudio = resampledBuffer.getChannelData(0) as Float32Array<ArrayBuffer>;

                
        let maxAmplitude = 0;
        for (const sample of finalAudio) {
            const absSample = Math.abs(sample);
            if (absSample > maxAmplitude) {
                maxAmplitude = absSample;
            }
                }
        console.log('Max amplitude in WhisperDebugPage:', maxAmplitude)
      }

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
      
      // Send message to worker
      workerRef.current.postMessage({
        type: 'transcribe',
        audio: extractedAudio,
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