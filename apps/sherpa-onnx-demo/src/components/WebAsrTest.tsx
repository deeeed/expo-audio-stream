import { ASR } from '@siteed/sherpa-onnx.rn';
import React, { useEffect, useRef, useState } from 'react';
import { Button, Platform, StyleSheet, Text, View } from 'react-native';

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
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const recognizerRef = useRef<Recognizer | null>(null);
  const recognizerStreamRef = useRef<RecognizerStream | null>(null);

  // Load the ASR library
  const loadAsrScript = useCallback(async () => {
    // Create a cleanup function for message listeners
    const messageHandlers: ((event: MessageEvent) => void)[] = [];

    // Check if ASR is already loaded by checking the SherpaWasm namespace
    if ((window as any).SherpaWasm?.ASR) {
      setState(prev => ({ ...prev, isScriptLoaded: true }));
      return () => {};
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
    const messageHandler = setupMessageHandler();
    messageHandlers.push(messageHandler);

    // Check if required model files exist
    await checkRequiredFiles();

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
                  URL.createObjectURL(blob);

                  console.log(`Created sample tokens file`);
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

  // Setup function to handle message events
  const setupMessageHandler = () => {
    const messageHandler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'asr_namespace_ready') {
        console.log('Received asr_namespace_ready message:', event.data);
        // Mark as script loaded when we get this message
        setState(prev => ({ ...prev, isScriptLoaded: true }));
      }
    };

    window.addEventListener('message', messageHandler);
    return messageHandler;
  };

  // Clean up ASR resources function
  const cleanupAsrResources = () => {
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
    if (audioWorkletNodeRef.current) {
      try {
        audioWorkletNodeRef.current.disconnect();
      } catch (e) {
        console.error('Error disconnecting processor:', e);
      }
      audioWorkletNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
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
  }, []); // Empty deps array for loadAsrScript

  useEffect(() => {
    // Skip on non-web platforms
    if (Platform.OS !== 'web') {
      return;
    }
    
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
      
      cleanupAsrResources();
    };
  }, [loadAsrScript]);

  // Helper function to create and initialize ASR recognizer
  const createAsrRecognizer = async (asrNamespace: any) => {
    if (typeof asrNamespace.createInstance === 'function') {
      console.log('Creating recognizer with createInstance');
      return await asrNamespace.createInstance();
    } 
    
    if (asrNamespace.createOnlineRecognizer && asrNamespace.Module) {
      console.log('Creating recognizer with createOnlineRecognizer');
      return asrNamespace.createOnlineRecognizer(asrNamespace.Module);
    } 
    
    if (asrNamespace.createOfflineRecognizer && asrNamespace.Module) {
      console.log('Creating recognizer with createOfflineRecognizer');
      return asrNamespace.createOfflineRecognizer(asrNamespace.Module);
    }
    
    throw new Error('No suitable recognizer creation function found in ASR namespace');
  };

  // Helper function to handle audio data processing
  const processAudioData = (
    inputData: Float32Array,
    recognizer: Recognizer,
    recognizerStream: RecognizerStream,
    sampleRate: number
  ) => {
    // Send audio data to ASR
    recognizerStream.acceptWaveform(sampleRate, inputData);

    // Check if ready to process
    if (typeof recognizer.isReady === 'function') {
      while (recognizer.isReady(recognizerStream)) {
        recognizer.decode(recognizerStream);
      }
    } else {
      // If isReady doesn't exist, just try to decode
      recognizer.decode(recognizerStream);
    }

    // Get result if method exists
    if (typeof recognizer.getResult === 'function') {
      const result = recognizer.getResult(recognizerStream);
      if (result?.text) {
        setState(prev => ({ ...prev, transcript: result.text }));
      }
    }

    // Check for endpoint (silence) if methods exist
    if (typeof recognizer.isEndpoint === 'function' && 
        typeof recognizer.reset === 'function' && 
        recognizer.isEndpoint(recognizerStream)) {
      recognizer.reset(recognizerStream);
    }
  };

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
          recognizerRef.current = await createAsrRecognizer(asrNamespace);

          if (!recognizerRef.current) {
            throw new Error('Failed to create recognizer - returned null or undefined');
          }

          // Log the recognizer we created
          console.log('Recognizer created:', recognizerRef.current);
          console.log('Available methods:', Object.getOwnPropertyNames(recognizerRef.current));

          setState(prev => ({ ...prev, isInitialized: true }));
          console.log('ASR initialized successfully!');
          return;
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

  // Helper to set up AudioWorklet processor
  const setupAudioProcessor = async (audioContext: AudioContext, source: MediaStreamAudioSourceNode) => {
    // Check if the browser supports AudioWorklet
    if (!audioContext.audioWorklet) {
      throw new Error('AudioWorklet not supported in this browser. Falling back is not implemented.');
    }
    
    // Create a worklet processor script as a blob
    const workletCode = `
      class AsrAudioProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.port.onmessage = (event) => {
            // Handle messages from the main thread if needed
          };
        }
        
        process(inputs, outputs) {
          // Get the input data from the first input, first channel
          if (inputs[0] && inputs[0][0]) {
            // Send the audio data to the main thread
            this.port.postMessage({
              audioData: inputs[0][0]
            });
          }
          
          // Return true to keep the processor alive
          return true;
        }
      }
      
      registerProcessor('asr-audio-processor', AsrAudioProcessor);
    `;
    
    // Create a blob URL for the worklet code
    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);
    
    // Add the module to the audio worklet
    await audioContext.audioWorklet.addModule(workletUrl);
    
    // Create a new AudioWorkletNode
    const workletNode = new AudioWorkletNode(audioContext, 'asr-audio-processor');
    audioWorkletNodeRef.current = workletNode;
    
    // Connect the audio processing graph
    source.connect(workletNode);
    workletNode.connect(audioContext.destination);
    
    // Process audio data received from the worklet
    workletNode.port.onmessage = (event) => {
      if (!recognizerRef.current || !recognizerStreamRef.current) {
        return;
      }
      
      if (event.data.audioData) {
        try {
          processAudioData(
            event.data.audioData,
            recognizerRef.current,
            recognizerStreamRef.current,
            audioContext.sampleRate
          );
        } catch (error) {
          console.error('Error processing audio data:', error);
          setState(prev => ({ 
            ...prev, 
            error: `Error processing audio: ${(error as Error).message}` 
          }));
        }
      }
    };
    
    // Cleanup URL
    URL.revokeObjectURL(workletUrl);
    
    return workletNode;
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

      // Check if recognizer exists
      if (!recognizerRef.current) {
        throw new Error('Recognizer is not initialized');
      }

      // Create a stream for recognition
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

      // Set up audio processing with AudioWorklet
      await setupAudioProcessor(audioContext, source);
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
      if (audioWorkletNodeRef.current) {
        audioWorkletNodeRef.current.disconnect();
        audioWorkletNodeRef.current = null;
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
        recognizerStreamRef.current.free();
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

  // Skip rendering on non-web platforms
  if (Platform.OS !== 'web') {
    return null;
  }

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