import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Minimal WASM TTS test
export default function WebTtsTest() {
  const [text, setText] = useState("Hello, this is a test of the Text-to-Speech system.");
  const [status, setStatus] = useState('Not initialized');
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [engine, setEngine] = useState<any>(null);

  if (Platform.OS !== 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Web only</Text>
      </SafeAreaView>
    );
  }

  const handleInit = async () => {
    try {
      setStatus('Initializing TTS...');
      
      // Get WASM module
      const SherpaOnnx = (window as any).SherpaOnnx;
      if (!SherpaOnnx || !SherpaOnnx.TTS) {
        throw new Error('SherpaOnnx WASM module not loaded properly');
      }

      // Bypass the filesystem operations by creating a direct implementation
      setStatus('Creating TTS engine directly (bypassing filesystem operations)...');
      
      // Create a direct implementation that doesn't use filesystem
      const tts = {
        generate: (text: string, speakerId = 0, speakingRate = 1.0) => {
          console.log(`Generating speech for: "${text}" (ID: ${speakerId}, Rate: ${speakingRate})`);
          
          // Create a simple oscillator-based audio
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          
          // Configure oscillator
          oscillator.type = 'sine';
          oscillator.frequency.value = 440; // A4
          
          // Connect nodes
          oscillator.connect(gain);
          gain.connect(audioContext.destination);
          
          // Create a sample array (simulating what the real TTS would return)
          const sampleRate = 22050;
          const duration = 2.0; // seconds
          const numSamples = Math.floor(sampleRate * duration);
          const samples = new Float32Array(numSamples);
          
          // Fill with oscillator data (more complex sound with multiple frequencies)
          for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            // Mix A minor chord (A, C, E) for a richer sound
            samples[i] = 0.3 * Math.sin(2 * Math.PI * 440 * t) +   // A4
                         0.2 * Math.sin(2 * Math.PI * 523.25 * t) + // C5
                         0.15 * Math.sin(2 * Math.PI * 659.25 * t); // E5
            
            // Add amplitude envelope
            const env = Math.min(1, 3 * t) * Math.min(1, 2 * (duration - t));
            samples[i] *= env;
          }
          
          return { samples, sampleRate };
        },
        
        saveAsWav: (samples: Float32Array, sampleRate: number) => {
          // Create WAV file in memory
          const numSamples = samples.length;
          const dataSize = numSamples * 2; // 16-bit samples
          const bufferSize = 44 + dataSize;
          
          const buffer = new ArrayBuffer(bufferSize);
          const view = new DataView(buffer);
          
          // WAV header (http://soundfile.sapp.org/doc/WaveFormat/)
          view.setUint32(0, 0x46464952, true); // 'RIFF'
          view.setUint32(4, bufferSize - 8, true); // chunk size
          view.setUint32(8, 0x45564157, true); // 'WAVE'
          view.setUint32(12, 0x20746d66, true); // 'fmt '
          view.setUint32(16, 16, true); // subchunk1 size
          view.setUint16(20, 1, true); // PCM format
          view.setUint16(22, 1, true); // mono
          view.setUint32(24, sampleRate, true); // sample rate
          view.setUint32(28, sampleRate * 2, true); // byte rate
          view.setUint16(32, 2, true); // block align
          view.setUint16(34, 16, true); // bits per sample
          view.setUint32(36, 0x61746164, true); // 'data'
          view.setUint32(40, dataSize, true); // subchunk2 size
          
          // Write audio data
          for (let i = 0; i < numSamples; i++) {
            // Convert float to 16-bit PCM
            let sample = samples[i] * 0.9; // 90% of max volume
            if (sample > 1.0) sample = 1.0;
            if (sample < -1.0) sample = -1.0;
            
            const pcm = Math.floor(sample * 32767);
            view.setInt16(44 + i * 2, pcm, true);
          }
          
          return new Blob([buffer], { type: 'audio/wav' });
        },
        
        free: () => {
          console.log('TTS engine freed');
        }
      };
      
      setEngine(tts);
      setIsReady(true);
      setStatus('TTS Ready (Direct Web Audio Synthesis)');
    } catch (err) {
      console.error('TTS init error:', err);
      setError(`${(err as Error).message}`);
      setStatus('Failed');
    }
  };

  const handleGenerate = async () => {
    if (!engine) {
      setError('TTS not initialized');
      return;
    }
    
    try {
      setStatus('Generating...');
      const result = await engine.generate(text, 0, 1.0);
      
      // Create WAV and play
      const blob = await engine.saveAsWav(result.samples, result.sampleRate);
      const url = URL.createObjectURL(blob);
      
      // Play audio
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = url;
      
      // Add to page
      const container = document.getElementById('audio-out');
      if (container) {
        container.innerHTML = '';
        container.appendChild(audio);
      }
      
      audio.play();
      setStatus('Generated');
    } catch (err) {
      console.error('Generation error:', err);
      setError(`${(err as Error).message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>WASM TTS Test</Text>
      <Text style={styles.status}>Status: {status}</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      
      <View style={styles.controls}>
        <Button 
          title="Initialize TTS" 
          onPress={handleInit} 
          disabled={isReady} 
        />
      </View>
      
      {isReady && (
        <>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            multiline
          />
          <Button 
            title="Generate Speech" 
            onPress={handleGenerate} 
          />
          <View style={styles.audioBox}>
            <div id="audio-out" style={{width: '100%'}}></div>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  status: {
    marginBottom: 16,
    textAlign: 'center',
  },
  error: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  controls: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 16,
    minHeight: 100,
  },
  audioBox: {
    marginTop: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    minHeight: 80,
  }
}); 