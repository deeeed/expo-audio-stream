// apps/playground/src/hooks/useCryDetector.ts
import EssentiaAPI from '@siteed/react-native-essentia';
import { useCallback, useState } from 'react';
import { baseLogger } from '../config';
import { useOnnxModel } from './useOnnxModel';

const logger = baseLogger.extend('useCryDetector');

export interface UseCryDetectorProps {
    onError?: (error: Error) => void;
}

export interface CryDetectionResult {
    probability: number; // Probability of baby cry (0 to 1)
    isCrying: boolean;   // True if probability exceeds threshold
    timestamp: number;   // Timestamp of detection
}

export function useCryDetector({ onError }: UseCryDetectorProps = {}) {
    const [isProcessing, setIsProcessing] = useState(false);

    const { isLoading: isModelLoading, initModel, createTensor } = useOnnxModel({
        modelUri: require('@assets/models/cry-detect.onnx'),
        onError,
    });

    // Common parameters
    const frameSize = 400; // 25 ms at 16,000 Hz
    const hopSize = 160;   // 10 ms at 16,000 Hz
    const fftSize = 1024;  // Renamed from n_fft to fftSize and used below
    const sr = 16000;      // Sample rate
    const threshold = 0.5; // Detection threshold

    const detectCryManually = useCallback(
        async (
            audioData: Float32Array,
            timestamp: number = Date.now()
        ): Promise<CryDetectionResult | null> => {
            try {
                setIsProcessing(true);
                console.log('Starting manual cry detection');
    
                // Set audio data in EssentiaAPI
                const sr = 16000;
                await EssentiaAPI.setAudioData(audioData, sr);
    
                // Define parameters matching Python
                const frameSize = 25 * 16; // 400 samples
                const hopSize = 10 * 16;   // 160 samples
                const n_mfcc = 40;
                const n_mels = 128;
                const n_bands = 7;
                const fmin = 100;
                const n_chroma = 12;
    
                // Helper function to compute mean across frames with proper typing
                const computeMean = (data: number[][] | number[]): number[] => {
                    if (data.length === 0) {
                        return [];
                    }
                    
                    if (Array.isArray(data[0])) {
                        // Handle 2D array case
                        const frames = data as number[][];
                        const featureLength = frames[0].length;
                        const result = new Array(featureLength).fill(0);
                        
                        for (let i = 0; i < frames.length; i++) {
                            for (let j = 0; j < featureLength; j++) {
                                result[j] += frames[i][j];
                            }
                        }
                        
                        for (let j = 0; j < featureLength; j++) {
                            result[j] /= frames.length;
                        }
                        
                        return result;
                    } else {
                        // It's already a 1D array
                        return data as number[];
                    }
                };
    
                // 1. Extract MFCC
                const mfccResult = await EssentiaAPI.extractMFCC({
                    sampleRate: sr,
                    frameSize,
                    hopSize,
                    numberCoefficients: n_mfcc,
                    numberBands: 128, // Mel filter banks, adjust if needed
                });
                
                // Type guard to check for proper response structure
                if (!('mfcc' in mfccResult)) {
                    throw new Error('MFCC extraction failed');
                }
                
                const mfcc = mfccResult.mfcc;
                const mfccMean = computeMean(mfcc);
                if (mfccMean.length !== n_mfcc) {
                    throw new Error(`MFCC length is ${mfccMean.length}, expected ${n_mfcc}`);
                }
                console.log('MFCC extracted', { length: mfccMean.length });
    
                // 2. Extract Mel Spectrogram
                const melResult = await EssentiaAPI.extractMelBands({
                    sampleRate: sr,
                    frameSize,
                    hopSize,
                    numberBands: n_mels,
                });
                
                // Type guard for mel bands
                if (!('melBands' in melResult)) {
                    throw new Error('Mel Spectrogram extraction failed');
                }
                
                const mel = melResult.melBands;
                const melMean = computeMean(mel);
                if (melMean.length !== n_mels) {
                    throw new Error(`Mel length is ${melMean.length}, expected ${n_mels}`);
                }
                console.log('Mel Spectrogram extracted', { length: melMean.length });
    
                // 3. Extract Chroma
                const chromaResult = await EssentiaAPI.extractChroma({
                    sampleRate: sr,
                    frameSize,
                    hopSize,
                    size: n_chroma,
                });
                
                // Type guard for chroma
                if (!('chroma' in chromaResult)) {
                    throw new Error('Chroma extraction failed');
                }
                
                const chroma = chromaResult.chroma;
                const chromaMean = computeMean(chroma);
                if (chromaMean.length !== n_chroma) {
                    throw new Error(`Chroma length is ${chromaMean.length}, expected ${n_chroma}`);
                }
                console.log('Chroma extracted', { length: chromaMean.length });
    
                // 4. Extract Spectral Contrast
                const contrastResult = await EssentiaAPI.extractSpectralContrast({
                    sampleRate: sr,
                    frameSize,
                    hopSize,
                    numberBands: n_bands,
                    lowFrequencyBound: fmin,
                });
                
                // Type guard for spectral contrast
                if (!('contrast' in contrastResult)) {
                    throw new Error('Spectral Contrast extraction failed');
                }
                
                const contrast = contrastResult.contrast;
                const contrastMean = computeMean(Array.isArray(contrast[0]) ? contrast as number[][] : [contrast as number[]]);
                const expectedContrastLength = n_bands + 1; // 8
                if (contrastMean.length !== expectedContrastLength) {
                    throw new Error(`Contrast length is ${contrastMean.length}, expected ${expectedContrastLength}`);
                }
                console.log('Spectral Contrast extracted', { length: contrastMean.length });
    
                // 5. Extract Tonnetz
                const tonnetzResult = await EssentiaAPI.extractTonnetz({
                    sampleRate: sr,
                    frameSize,
                    hopSize,
                });
                
                // Type guard for tonnetz
                if (!('tonnetz' in tonnetzResult)) {
                    throw new Error('Tonnetz extraction failed');
                }
                
                const tonnetz = tonnetzResult.tonnetz;
                const tonnetzMean = computeMean(Array.isArray(tonnetz[0]) ? tonnetz as number[][] : [tonnetz as number[]]);
                const expectedTonnetzLength = 6;
                if (tonnetzMean.length !== expectedTonnetzLength) {
                    throw new Error(`Tonnetz length is ${tonnetzMean.length}, expected ${expectedTonnetzLength}`);
                }
                console.log('Tonnetz extracted', { length: tonnetzMean.length });
    
                // Concatenate features in the same order as Python
                const features: number[] = [...mfccMean, ...chromaMean, ...melMean, ...contrastMean, ...tonnetzMean];
                if (features.length !== 194) {
                    throw new Error(`Total feature length is ${features.length}, expected 194`);
                }
                console.log('Features concatenated', { length: features.length });
    
                // Run ONNX model
                const model = await initModel();
                const inputTensor = createTensor('float32', new Float32Array(features), [1, features.length]);
                const results = await model.run({ input: inputTensor });
                const probability = (results.output.data as Float32Array)[0];
                const isCrying = probability > threshold;
    
                console.log('Cry detection result', { probability, isCrying });
    
                return { probability, isCrying, timestamp };
            } catch (error) {
                console.error('Error in cry detection', { error });
                onError?.(error instanceof Error ? error : new Error('Cry detection failed'));
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        [initModel, createTensor, onError]
    );
    
    // Pipeline feature extraction method
    const detectCryWithPipeline = useCallback(
        async (
            audioData: Float32Array,
            timestamp: number = Date.now()
        ): Promise<CryDetectionResult | null> => {
            try {
                setIsProcessing(true);
                logger.debug('Starting pipeline cry detection');

                await EssentiaAPI.setAudioData(audioData, sr);

                // Pipeline configuration
                const pipelineConfig = {
                    preprocess: [
                        { name: "FrameCutter", params: { frameSize, hopSize } },
                        {
                            name: "Windowing",
                            params: { type: "hann", size: frameSize, zeroPadding: fftSize - frameSize },
                        },
                        { name: "Spectrum", params: { size: fftSize } },
                        {
                            name: "HPCP", 
                            params: { 
                                sampleRate: sr, 
                                size: 12,
                                minFrequency: 20, // Changed from 0 to 20Hz
                                maxFrequency: sr / 2 
                            },
                        },
                    ],
                    features: [
                        {
                            name: "MFCC",
                            input: "Spectrum",
                            params: {
                                sampleRate: sr,
                                numberBands: 128,
                                numberCoefficients: 40,
                                warpingFormula: "htkMel",
                                type: "power",
                                lowFrequencyBound: 0,
                                highFrequencyBound: sr / 2,
                            },
                            postProcess: { mean: true },
                        },
                        {
                            name: "MelBands",
                            input: "Spectrum",
                            params: { sampleRate: sr, numberBands: 128, type: "power", log: false },
                            postProcess: { mean: true },
                        },
                        {
                            name: "SpectralContrast",
                            input: "Spectrum",
                            params: { sampleRate: sr, numberBands: 7, lowFrequencyBound: 100 },
                            postProcess: { mean: true },
                        },
                        {
                            name: "Tonnetz",
                            input: "HPCP", 
                            params: {},
                            postProcess: { mean: true },
                        },
                    ],
                    postProcess: { concatenate: true },
                };

                // Execute pipeline
                const result = await EssentiaAPI.executePipeline(pipelineConfig);
                if (!result.success || !result.data?.concatenatedFeatures) {
                    throw new Error('Pipeline execution failed: ' + (result.error?.message || 'Unknown error'));
                }

                const features = result.data.concatenatedFeatures as number[];
                logger.debug('Pipeline extracted features', { featureLength: features.length });

                // Run ONNX model
                const model = await initModel();
                const inputTensor = createTensor('float32', new Float32Array(features), [1, features.length]);
                const results = await model.run({ input: inputTensor });
                const probability = (results.output.data as Float32Array)[0];
                const isCrying = probability > threshold;

                logger.debug('Cry detection result', { probability, isCrying });

                return { probability, isCrying, timestamp };
            } catch (error) {
                logger.error('Pipeline cry detection error', { error });
                onError?.(error instanceof Error ? error : new Error('Pipeline cry detection failed'));
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        [initModel, createTensor, onError]
    );

    // Helper function to compute mean across frames - improved to handle empty arrays
    const _computeMean = (frames: number[][]): number[] => {
        if (frames.length === 0) {
            return []; // Return empty array if no frames are provided
        }
        
        const numFrames = frames.length;
        const featureSize = frames[0].length;
        const mean = new Array(featureSize).fill(0);

        // Check if all frames have the same dimension
        for (let i = 1; i < numFrames; i++) {
            if (frames[i].length !== featureSize) {
                console.warn(`Frame ${i} has inconsistent feature size: ${frames[i].length} vs ${featureSize}`);
                // Handle this case - we could either:
                // 1. Skip this frame
                // 2. Truncate to smaller size
                // 3. Pad with zeros
                // Here we'll truncate to smaller size
                const minSize = Math.min(frames[i].length, featureSize);
                for (let j = 0; j < numFrames; j++) {
                    if (frames[j].length > minSize) {
                        frames[j] = frames[j].slice(0, minSize);
                    }
                }
            }
        }

        // Recompute feature size in case it changed
        const finalFeatureSize = frames[0].length;
        
        // Reset mean array with new size
        for (let j = 0; j < finalFeatureSize; j++) {
            mean[j] = 0;
        }

        // Sum values
        for (let i = 0; i < numFrames; i++) {
            for (let j = 0; j < finalFeatureSize; j++) {
                mean[j] += frames[i][j];
            }
        }

        // Divide by count
        for (let j = 0; j < finalFeatureSize; j++) {
            mean[j] /= numFrames;
        }

        return mean;
    };

    return {
        isModelLoading,
        isProcessing,
        detectCryManually,
        detectCryWithPipeline,
    };
}