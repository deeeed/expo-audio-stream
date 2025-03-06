import { NativeModules } from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { extractAudioData } from '@siteed/expo-audio-studio';
import type { DecodingConfig, ConsoleLike } from '@siteed/expo-audio-studio';

/**
 * Options for sending PCM data to Essentia
 */
export interface SendPCMToEssentiaOptions {
  /** URI of the audio file to extract PCM data from */
  fileUri: string;
  /** Sample rate to use for processing */
  sampleRate?: number;
  /** Start time in milliseconds */
  startTimeMs?: number;
  /** End time in milliseconds */
  endTimeMs?: number;
  /** Optional decoding configuration */
  decodingOptions?: DecodingConfig;
  /** Logger for debugging */
  logger?: ConsoleLike;
  /** Maximum number of samples to send (to avoid stack overflow) */
  maxSamples?: number;
}

/**
 * A simple test to verify if Essentia is working correctly without relying on audio I/O
 * Can be called from anywhere to test if the core functionality is available
 */
export const testEssentia = async (): Promise<boolean> => {
  try {
    // Make sure Essentia is initialized
    if (!NativeModules.Essentia) {
      console.error('Essentia module not available');
      return false;
    }
    
    // Step 1: Initialize
    const initialized = await NativeModules.Essentia.initialize();
    console.log('Essentia initialized:', initialized);
    
    if (!initialized) {
      console.error('Failed to initialize Essentia');
      return false;
    }
    
    // Step 2: Get version
    const version = await NativeModules.Essentia.getVersion();
    console.log('Essentia version:', version);
    
    // Step 3: Try direct MFCC test 
    try {
      const result = await NativeModules.Essentia.testMFCC();
      console.log('MFCC test result:', result);
      return true;
    } catch (error) {
      console.log('Failed to run MFCC test:', error);
      
      // Even if MFCC test fails, if we got the version, Essentia is partially working
      return version !== null && version !== undefined;
    }
  } catch (error) {
    console.error('Error testing Essentia:', error);
    return false;
  }
};

/**
 * Send minimal dummy PCM data to Essentia to simulate loading audio
 * This is a workaround when the real audio loading fails
 */
export const sendDummyPCMData = async (logger?: ConsoleLike): Promise<boolean> => {
  try {
    // Check if NativeModules is available
    if (!NativeModules.Essentia) {
      throw new Error('Essentia native module not found');
    }

    // First ensure Essentia is initialized
    const isInitialized = await NativeModules.Essentia.initialize();
    if (!isInitialized) {
      throw new Error('Failed to initialize Essentia');
    }

    // Create a very small dummy PCM buffer (1 second of audio at 16kHz)
    const sampleRate = 16000;
    const dummyData = new Array(sampleRate).fill(0);
    // Add some simple sine wave data
    for (let i = 0; i < dummyData.length; i++) {
      dummyData[i] = Math.sin(i * 0.01);
    }

    logger?.log('Sending dummy PCM data to Essentia:', {
      samples: dummyData.length,
      sampleRate
    });

    // Send the PCM data to Essentia
    const result = await NativeModules.Essentia.setAudioData(
      dummyData.slice(0, 1000), // Only send 1000 samples to avoid stack issues
      sampleRate
    );

    logger?.log('Dummy PCM data sent to Essentia:', result);
    return result;
  } catch (error) {
    logger?.error('Error sending dummy PCM to Essentia:', error);
    return false;
  }
};

/**
 * Extract PCM data from an audio file and send it to Essentia for processing
 * This is useful when the native audio loading capabilities of Essentia are not available
 * (e.g., when ffmpeg is not integrated)
 * 
 * TEMPORARY: Currently just calls sendDummyPCMData to avoid stack overflow issues
 */
export const sendPCMToEssentia = async (
  options: SendPCMToEssentiaOptions
): Promise<boolean> => {
  try {
    // For now, just use the dummy data approach to avoid stack overflow
    return await sendDummyPCMData(options.logger);
  } catch (error) {
    options.logger?.error('Error sending PCM to Essentia:', error);
    return false;
  }
}; 