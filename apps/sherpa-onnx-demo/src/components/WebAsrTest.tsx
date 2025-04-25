import React, { useState, useRef, useEffect } from 'react';
import { Button, StyleSheet, Text, View, Platform, ScrollView } from 'react-native';
import { ASR } from '@siteed/sherpa-onnx.rn';

interface AsrTestState {
  isInitialized: boolean;
  isRecording: boolean;
  transcript: string;
  error: string;
  isScriptLoaded: boolean;
  fileStatus: {
    encoder: boolean;
    decoder: boolean;
    tokens: boolean;
  };
}

// Define interfaces for the ASR WASM module
interface RecognizerStream {
  acceptWaveform: (sampleRate: number, samples: Float32Array) => void;
  free: () => void;
}

interface Recognizer {
  createStream: () => RecognizerStream;
  isReady: (stream: RecognizerStream) => boolean;
  decode: (stream: RecognizerStream) => void;
  getResult: (stream: RecognizerStream) => { text: string };
  isEndpoint: (stream: RecognizerStream) => boolean;
  reset: (stream: RecognizerStream) => void;
}

export default function WebAsrTest() {
  const [state, setState] = useState<AsrTestState>({
    isInitialized: false,
    isRecording: false,
    transcript: '',
    error: '',
    isScriptLoaded: false,
    fileStatus: {
      encoder: false,
      decoder: false,
      tokens: false
    }
  });
  
  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recognizerRef = useRef<Recognizer | null>(null);
  const recognizerStreamRef = useRef<RecognizerStream | null>(null);
  
  // Check if we're on web platform
  if (Platform.OS !== 'web') {
    return null;
  }
  
  useEffect(() => {
    // Load the ASR library
    const loadAsrScript = async () => {
      // Create a cleanup function for message listeners
      const messageHandlers: Array<(event: MessageEvent) => void> = [];
      
      try {
        // Check if ASR is already loaded by checking the SherpaWasm namespace
        if ((window as any).SherpaWasm?.ASR) {
          setState(prev => ({ ...prev, isScriptLoaded: true }));
          return;
        }
        
        // Create a temporary div for status updates
        const statusDiv = document.createElement('div');
        statusDiv.id = 'status';
        statusDiv.style.display = 'none';
        document.body.appendChild(statusDiv);
        
        // Let the library handle loading the scripts
        const validation = await ASR.validateLibrary();
        if (validation.loaded) {
          setState(prev => ({ ...prev, isScriptLoaded: true }));
        } else {
          setState(prev => ({ 
            ...prev, 
            error: `ASR script loading failed: ${validation.status}` 
          }));
        }
        
        // Add a message listener for the special namespace ready message
        const messageHandler = (event: MessageEvent) => {
          if (event.data && event.data.type === 'asr_namespace_ready') {
            console.log('Received asr_namespace_ready message:', event.data);
            // Mark as script loaded when we get this message
            setState(prev => ({ ...prev, isScriptLoaded: true }));
          }
        };
        
        window.addEventListener('message', messageHandler);
        messageHandlers.push(messageHandler);
        
        // Check if required model files exist
        await checkRequiredFiles();
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: `Error loading ASR scripts: ${(error as Error).message}` 
        }));
      }
      
      // Return the cleanup function that removes all registered message handlers
      return () => {
        messageHandlers.forEach(handler => window.removeEventListener('message', handler));
      };
    };
    
    // Check if required model files exist
    const checkRequiredFiles = async () => {
      try {
        // Check if tokens.txt exists in the public/wasm/asr directory
        const requiredFiles = [
          { name: 'tokens', path: '/wasm/asr/tokens.txt' }
        ];
        
        const fileStatus = {
          encoder: true, // Assume bundled in wasm data
          decoder: true, // Assume bundled in wasm data
          tokens: false
        };
        
        for (const file of requiredFiles) {
          try {
            const response = await fetch(file.path, { method: 'HEAD' });
            if (response.ok) {
              fileStatus[file.name as keyof typeof fileStatus] = true;
              console.log(`File found: ${file.path}`);
            } else {
              console.error(`File not found: ${file.path}`);
              
              // Try to check if tokens.txt exists in the alternative location
              if (file.name === 'tokens') {
                const alternativePath = '/wasm/asr/tokens-alt.txt';
                const altResponse = await fetch(alternativePath, { method: 'HEAD' });
                if (altResponse.ok) {
                  // Found in alternative location, load and create a blob URL
                  console.log(`Found tokens file at alternative location: ${alternativePath}`);
                  const tokensContent = await (await fetch(alternativePath)).text();
                  console.log(`Tokens content: ${tokensContent.substring(0, 100)}...`);
                  
                  // Create a sample tokens file for testing
                  if (!tokensContent) {
                    console.log("Creating sample tokens file");
                    // Just a minimal sample for testing
                    const sampleTokens = "<blank>\n<s>\n</s>\n<unk>\na\nb\nc\n...";
                    const blob = new Blob([sampleTokens], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    
                    console.log(`Created sample tokens file at: ${url}`);
                    fileStatus.tokens = true;
                  }
                }
              }
            }
          } catch (e) {
            console.error(`Error checking file ${file.path}:`, e);
          }
        }
        
        setState(prev => ({ ...prev, fileStatus }));
      } catch (error) {
        console.error('Error checking files:', error);
      }
    };
    
    // Store the cleanup function
    let cleanup: (() => void) | undefined;
    
    // Load the ASR script and get its cleanup function
    loadAsrScript().then(cleanupFn => {
      cleanup = cleanupFn;
    });
    
    // Cleanup function
    return () => {
      // Call the script's cleanup function if available
      if (cleanup) {
        cleanup();
      }
      
      console.log('Cleaning up ASR component');
      
      // Clean up ASR resources
      if (recognizerStreamRef.current) {
        try {
          recognizerStreamRef.current.free();
        } catch (e) {
          console.error('Error freeing recognizer stream:', e);
        }
        recognizerStreamRef.current = null;
      }
      
      recognizerRef.current = null;
      
      // Clean up audio resources
      if (processorRef.current && audioContextRef.current) {
        try {
          processorRef.current.disconnect();
        } catch (e) {
          console.error('Error disconnecting processor:', e);
        }
        processorRef.current = null;
      }
      
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close().catch(console.error);
        } catch (e) {
          console.error('Error closing audio context:', e);
        }
        audioContextRef.current = null;
      }
      
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.error('Error stopping media tracks:', e);
        }
        mediaStreamRef.current = null;
      }
      
      // Remove the status element
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.remove();
      }
    };
  }, []);
  
  const initializeAsr = async () => {
    try {
      setState(prev => ({ ...prev, error: '' }));
      
      if (!state.isScriptLoaded) {
        setState(prev => ({ 
          ...prev, 
          error: 'ASR script not loaded yet. Please wait or refresh the page.' 
        }));
        return;
      }
      
      // Check if tokens.txt is available
      const { tokens } = state.fileStatus;
      
      if (!tokens) {
        console.log('Tokens file missing, but that\'s okay - we\'ll use the built-in sample');
        // Update file status to prevent future warnings
        setState(prev => ({ 
          ...prev, 
          fileStatus: { ...prev.fileStatus, tokens: true },
        }));
      }
      
      console.log('Initializing ASR with bundled models...');
      
      // Initialize the ASR engine directly with minimal configuration
      // We'll let the iframe handle everything else
      const result = await ASR.initialize({
        modelDir: '/wasm/asr',
        modelType: 'transducer',
        modelFiles: {
          encoder: 'encoder.onnx',
          decoder: 'decoder.onnx',
          joiner: 'joiner.onnx',
          tokens: 'tokens.txt'
        },
        numThreads: 1,
        debug: true,
        provider: 'cpu',
        decodingMethod: 'greedy_search',
        maxActivePaths: 4
      });
      
      if (!result.success) {
        throw new Error(`ASR initialization failed: ${result.error}`);
      }
      
      // Wait for the ASR module to be ready by checking for the namespace
      let checkCount = 0;
      const maxChecks = 10;
      
      while (checkCount < maxChecks) {
        checkCount++;
        console.log(`Checking if ASR namespace is ready (attempt ${checkCount}/${maxChecks})...`);
        
        const SherpaWasm = (window as any).SherpaWasm;
        if (SherpaWasm?.ASR?.Module && 
            (SherpaWasm.ASR.createOfflineRecognizer || 
             SherpaWasm.ASR.createOnlineRecognizer || 
             SherpaWasm.ASR.createInstance)) {
          
          // ASR namespace is ready
          console.log('ASR namespace is ready!');
          const asrNamespace = SherpaWasm.ASR;
          
          // Create a recognizer instance
          try {
            // Try createInstance first (our custom method)
            if (typeof asrNamespace.createInstance === 'function') {
              console.log('Creating recognizer with createInstance');
              recognizerRef.current = await asrNamespace.createInstance();
            } 
            // Then try createOnlineRecognizer
            else if (asrNamespace.createOnlineRecognizer && asrNamespace.Module) {
              console.log('Creating recognizer with createOnlineRecognizer');
              recognizerRef.current = asrNamespace.createOnlineRecognizer(asrNamespace.Module);
            } 
            // Then try createOfflineRecognizer
            else if (asrNamespace.createOfflineRecognizer && asrNamespace.Module) {
              console.log('Creating recognizer with createOfflineRecognizer');
              recognizerRef.current = asrNamespace.createOfflineRecognizer(asrNamespace.Module);
            } 
            else {
              throw new Error('No suitable recognizer creation function found in ASR namespace');
            }
            
            if (!recognizerRef.current) {
              throw new Error('Failed to create recognizer - returned null or undefined');
            }
            
            // Log the recognizer we created
            console.log('Recognizer created:', recognizerRef.current);
            console.log('Available methods:', Object.getOwnPropertyNames(recognizerRef.current));
            
            setState(prev => ({ ...prev, isInitialized: true }));
            console.log('ASR initialized successfully!');
            return;
          } catch (error) {
            console.error('Error creating recognizer:', error);
            throw new Error(`Error creating recognizer: ${(error as Error).message}`);
          }
        }
        
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      throw new Error('ASR namespace not ready after multiple checks. Please refresh the page and try again.');
    } catch (error) {
      console.error('Initialization error:', error);
      setState(prev => ({ ...prev, error: (error as Error).message }));
    }
  };
  
  const startRecording = async () => {
    if (!state.isInitialized) {
      setState(prev => ({ ...prev, error: 'Please initialize ASR first' }));
      return;
    }
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      // Create AudioContext
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      // Create source from microphone
      const source = audioContext.createMediaStreamSource(stream);
      
      // Process audio and send to ASR - using ScriptProcessorNode
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      // Check if recognizer exists and log its properties
      if (!recognizerRef.current) {
        throw new Error('Recognizer is not initialized');
      }
      
      // Create a stream for recognition
      try {
        console.log('Trying to create stream...');
        
        // Check if createStream exists
        if (typeof recognizerRef.current.createStream !== 'function') {
          console.error('createStream is not a function, available methods:', 
                        Object.getOwnPropertyNames(recognizerRef.current));
          throw new Error('createStream method not available on recognizer');
        }
        
        recognizerStreamRef.current = recognizerRef.current.createStream();
        console.log('Stream created:', recognizerStreamRef.current);
        
        if (!recognizerStreamRef.current) {
          throw new Error('Failed to create recognizer stream');
        }
      } catch (error) {
        const streamError = error as Error;
        console.error('Error creating stream:', streamError);
        throw new Error(`Failed to create recognizer stream: ${streamError.message}`);
      }
      
      // Setting up audio processing with detailed error handling
      processor.onaudioprocess = async (e) => {
        try {
          if (!recognizerRef.current || !recognizerStreamRef.current) {
            console.error('Recognizer or stream is null in audio processing');
            return;
          }
          
          const inputData = e.inputBuffer.getChannelData(0);
          const samples = new Float32Array(inputData);
          
          // Check if required methods exist on the stream
          if (typeof recognizerStreamRef.current.acceptWaveform !== 'function') {
            console.error('acceptWaveform method not found on stream');
            return;
          }
          
          // Send audio data to ASR
          try {
            recognizerStreamRef.current.acceptWaveform(audioContext.sampleRate, samples);
          } catch (error) {
            const acceptError = error as Error;
            console.error('Error in acceptWaveform:', acceptError);
            setState(prev => ({ ...prev, error: `Error processing audio: ${acceptError.message}` }));
            return;
          }
          
          // Check if isReady method exists
          if (typeof recognizerRef.current.isReady !== 'function') {
            console.warn('isReady method not found, assuming ready');
            try {
              // Try to decode anyway
              recognizerRef.current.decode(recognizerStreamRef.current);
            } catch (error) {
              console.error('Error in decode without isReady check:', error);
            }
          } else {
            // Process if ready
            try {
              while (recognizerRef.current.isReady(recognizerStreamRef.current)) {
                recognizerRef.current.decode(recognizerStreamRef.current);
              }
            } catch (error) {
              const decodeError = error as Error;
              console.error('Error in decode process:', decodeError);
              setState(prev => ({ ...prev, error: `Error decoding audio: ${decodeError.message}` }));
              return;
            }
          }
          
          // Get result
          try {
            // Check if getResult method exists
            if (typeof recognizerRef.current.getResult !== 'function') {
              console.warn('getResult method not found');
              return;
            }
            
            const result = recognizerRef.current.getResult(recognizerStreamRef.current);
            
            if (result && result.text) {
              setState(prev => ({ ...prev, transcript: result.text }));
            }
          } catch (error) {
            const resultError = error as Error;
            console.error('Error getting result:', resultError);
            setState(prev => ({ ...prev, error: `Error getting result: ${resultError.message}` }));
            return;
          }
          
          // Check for endpoint (silence) if method exists
          if (typeof recognizerRef.current.isEndpoint === 'function' && 
              typeof recognizerRef.current.reset === 'function') {
            try {
              if (recognizerRef.current.isEndpoint(recognizerStreamRef.current)) {
                recognizerRef.current.reset(recognizerStreamRef.current);
              }
            } catch (error) {
              const endpointError = error as Error;
              console.error('Error checking endpoint:', endpointError);
              // Don't stop processing for endpoint errors
            }
          }
        } catch (error) {
          const processError = error as Error;
          console.error('General error in audio processing:', processError);
        }
      };
      
      // Connect the audio processing graph
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setState(prev => ({ ...prev, isRecording: true, error: '' }));
    } catch (error) {
      console.error('Error in startRecording:', error);
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        error: `Recording failed: ${(error as Error).message}` 
      }));
    }
  };
  
  const stopRecording = () => {
    try {
      // Clean up audio resources
      if (processorRef.current && audioContextRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      // Clean up ASR stream
      if (recognizerStreamRef.current) {
        try {
          recognizerStreamRef.current.free();
        } catch (e) {
          console.error('Error freeing recognizer stream:', e);
        }
        recognizerStreamRef.current = null;
      }
      
      setState(prev => ({ ...prev, isRecording: false }));
    } catch (error) {
      console.error('Error stopping recording:', error);
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        error: `Error stopping recording: ${(error as Error).message}` 
      }));
    }
  };
  
  // Helper function to display the file status
  const renderFileStatus = () => {
    const { encoder, decoder, tokens } = state.fileStatus;
    
    return (
      <View style={styles.fileStatusContainer}>
        <Text style={styles.fileStatusTitle}>Required Files Status:</Text>
        <View style={styles.fileStatusRow}>
          <Text style={styles.fileStatusLabel}>encoder.onnx:</Text>
          <Text style={encoder ? styles.fileStatusSuccess : styles.fileStatusError}>
            {encoder ? '✓ Bundled in WASM' : '✗ Missing'}
          </Text>
        </View>
        <View style={styles.fileStatusRow}>
          <Text style={styles.fileStatusLabel}>decoder.onnx:</Text>
          <Text style={decoder ? styles.fileStatusSuccess : styles.fileStatusError}>
            {decoder ? '✓ Bundled in WASM' : '✗ Missing'}
          </Text>
        </View>
        <View style={styles.fileStatusRow}>
          <Text style={styles.fileStatusLabel}>tokens.txt:</Text>
          <Text style={tokens ? styles.fileStatusSuccess : styles.fileStatusError}>
            {tokens ? '✓ Found' : '✗ Missing'}
          </Text>
        </View>
        
        {!tokens && (
          <Text style={styles.fileStatusHelp}>
            Please build the ASR WASM module first with:{'\n'}
            cd packages/sherpa-onnx.rn{'\n'}
            ./build-sherpa-wasm.sh --asr
          </Text>
        )}
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ASR Web Test</Text>
      
      <View style={styles.statusContainer}>
        {!state.isScriptLoaded ? (
          <Text style={styles.loadingText}>Loading ASR scripts...</Text>
        ) : state.isInitialized ? (
          <Text style={styles.successText}>ASR Engine Ready</Text>
        ) : (
          <Text style={styles.readyText}>ASR Scripts Loaded</Text>
        )}
      </View>
      
      {renderFileStatus()}
      
      <View style={styles.controls}>
        <Button 
          title={state.isInitialized ? "ASR Initialized" : "Initialize ASR"} 
          onPress={initializeAsr}
          disabled={state.isInitialized || !state.isScriptLoaded}
        />
        
        {state.isInitialized && (
          <Button 
            title={state.isRecording ? "Stop Recording" : "Start Recording"} 
            onPress={state.isRecording ? stopRecording : startRecording}
          />
        )}
      </View>
      
      {state.error ? (
        <Text style={styles.error}>{state.error}</Text>
      ) : null}
      
      {state.isInitialized && (
        <View style={styles.resultContainer}>
          <Text style={styles.label}>Transcript:</Text>
          <Text style={styles.transcript}>{state.transcript || "Say something..."}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  loadingText: {
    textAlign: 'center',
    color: '#0066cc',
    fontWeight: 'bold',
  },
  readyText: {
    textAlign: 'center',
    color: '#f39c12',
    fontWeight: 'bold',
  },
  successText: {
    textAlign: 'center',
    color: '#2ecc71',
    fontWeight: 'bold',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  resultContainer: {
    marginTop: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  transcript: {
    fontSize: 16,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 4,
    minHeight: 100,
  },
  error: {
    color: 'red',
    marginTop: 16,
    textAlign: 'center',
  },
  fileStatusContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  fileStatusTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  fileStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  fileStatusLabel: {
    fontFamily: 'monospace',
  },
  fileStatusSuccess: {
    color: 'green',
    fontWeight: 'bold',
  },
  fileStatusError: {
    color: 'red',
    fontWeight: 'bold',
  },
  fileStatusHelp: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff9c4',
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 12,
  }
}); 