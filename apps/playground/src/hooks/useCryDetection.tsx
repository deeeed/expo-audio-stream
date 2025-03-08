// apps/playground/src/hooks/useCryDetector.ts
import { useCallback, useState } from 'react';
import EssentiaAPI from '@siteed/react-native-essentia';
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
    const n_fft = 1024;    // FFT size
    const sr = 16000;      // Sample rate
    const threshold = 0.5; // Detection threshold

    // Manual feature extraction method
    const detectCryManually = useCallback(
        async (
            audioData: Float32Array,
            timestamp: number = Date.now()
        ): Promise<CryDetectionResult | null> => {
            try {
                setIsProcessing(true);
                logger.debug('Starting manual cry detection');

                await EssentiaAPI.setAudioData(audioData, sr);

                // Step 1: Frame the audio
                const frames = await EssentiaAPI.executeAlgorithm("FrameCutter", {
                    frameSize,
                    hopSize,
                });

                logger.debug('Frames result status:', frames.success ? 'Success' : 'Failed');

                if (!frames.success || !frames.data?.frame) {
                    throw new Error('Failed to retrieve frames from FrameCutter');
                }

                logger.debug('Number of frames:', frames.data.frame.length);
                logger.debug('First frame sample length:', frames.data.frame[0]?.length || 0);

                const mfccFrames: number[][] = [];
                const melFrames: number[][] = [];
                const chromaFrames: number[][] = [];
                const contrastFrames: number[][] = [];
                const tonnetzFrames: number[][] = [];

                // Process only a subset of frames for efficiency (every 5th frame)
                // This reduces processing time while still capturing the audio characteristics
                const frameStep = 5;
                const selectedFrames = frames.data.frame.filter((_: number[], index: number) => index % frameStep === 0);
                
                logger.debug(`Processing ${selectedFrames.length} frames out of ${frames.data.frame.length} total frames`);

                // Step 2: Process each selected frame to extract features
                for (let i = 0; i < selectedFrames.length; i++) {
                    const frame = selectedFrames[i];
                    
                    try {
                        // Set each frame as the current audio data
                        // Make sure the frame is a Float32Array
                        if (!frame || frame.length === 0) {
                            logger.warn(`Skipping empty frame at index ${i}`);
                            continue;
                        }
                        
                        await EssentiaAPI.setAudioData(new Float32Array(frame), sr);
                        
                        // Apply windowing with string type instead of object
                        const windowResult = await EssentiaAPI.executeAlgorithm("Windowing", {
                            type: "hann",
                            size: frame.length
                        });
                        
                        if (!windowResult.success || !windowResult.data?.frame) {
                            logger.warn(`Windowing failed for frame ${i}:`, windowResult.error || 'Unknown error');
                            continue;
                        }
                        
                        // Compute spectrum with zero padding
                        const spectrumResult = await EssentiaAPI.executeAlgorithm("Spectrum", { 
                            size: n_fft 
                        });
                        
                        if (!spectrumResult.success || !spectrumResult.data?.spectrum) {
                            logger.warn(`Spectrum computation failed for frame ${i}:`, spectrumResult.error || 'Unknown error');
                            continue;
                        }
                        
                        // Extract MFCC
                        const mfccResult = await EssentiaAPI.executeAlgorithm("MFCC", {
                            sampleRate: sr,
                            numberBands: 40,       // Reduced from 128 to improve performance
                            numberCoefficients: 40,
                            lowFrequencyBound: 0,
                            highFrequencyBound: sr / 2,
                        });
                        
                        if (mfccResult.success && mfccResult.data?.mfcc) {
                            mfccFrames.push(mfccResult.data.mfcc);
                        } else {
                            logger.warn(`MFCC extraction failed for frame ${i}:`, mfccResult.error || 'Unknown error');
                        }
                        
                        // Extract MelBands
                        const melResult = await EssentiaAPI.executeAlgorithm("MelBands", {
                            sampleRate: sr,
                            numberBands: 40,      // Reduced from 128 to improve performance
                            lowFrequencyBound: 0,
                            highFrequencyBound: sr / 2,
                        });
                        
                        if (melResult.success && melResult.data?.melBands) {
                            melFrames.push(melResult.data.melBands);
                        } else {
                            logger.warn(`MelBands extraction failed for frame ${i}:`, melResult.error || 'Unknown error');
                        }
                        
                        // Extract HPCP (Chroma)
                        const hpcpResult = await EssentiaAPI.executeAlgorithm("HPCP", {
                            sampleRate: sr,
                            size: 12,
                            minFrequency: 20,  // Add minimum frequency parameter 
                            maxFrequency: sr / 2
                        });
                        
                        if (hpcpResult.success && hpcpResult.data?.hpcp) {
                            chromaFrames.push(hpcpResult.data.hpcp);
                        } else {
                            logger.warn(`HPCP extraction failed for frame ${i}:`, hpcpResult.error || 'Unknown error');
                        }
                        
                        // Extract Spectral Contrast
                        const contrastResult = await EssentiaAPI.executeAlgorithm("SpectralContrast", {
                            sampleRate: sr,
                            numberBands: 7,
                            lowFrequencyBound: 100
                        });
                        
                        if (contrastResult.success && contrastResult.data?.contrast) {
                            contrastFrames.push(contrastResult.data.contrast);
                        } else {
                            logger.warn(`SpectralContrast extraction failed for frame ${i}:`, contrastResult.error || 'Unknown error');
                        }
                        
                        // Extract Tonnetz
                        if (chromaFrames.length > 0) { // Only extract Tonnetz if we have chroma data
                            const tonnetzResult = await EssentiaAPI.executeAlgorithm("Tonnetz", {});
                            
                            if (tonnetzResult.success && tonnetzResult.data?.tonnetz) {
                                tonnetzFrames.push(tonnetzResult.data.tonnetz);
                            } else {
                                logger.warn(`Tonnetz extraction failed for frame ${i}:`, tonnetzResult.error || 'Unknown error');
                            }
                        }
                        
                        // Log progress for every 10th frame
                        if (i % 10 === 0) {
                            logger.debug(`Processed ${i}/${selectedFrames.length} frames`);
                        }
                    } catch (frameError) {
                        logger.warn(`Error processing frame ${i}:`, frameError);
                        // Continue with next frame
                    }
                }

                logger.debug('Feature extraction complete. Results:', {
                    mfccFrames: mfccFrames.length,
                    melFrames: melFrames.length,
                    chromaFrames: chromaFrames.length,
                    contrastFrames: contrastFrames.length,
                    tonnetzFrames: tonnetzFrames.length,
                });

                // Step 3: Check if we have enough data to proceed
                if (mfccFrames.length === 0 && melFrames.length === 0 && 
                    chromaFrames.length === 0 && contrastFrames.length === 0) {
                    throw new Error('No features could be extracted from the audio');
                }

                // Step 4: Compute means with robust error handling
                const meanMFCC = computeMean(mfccFrames);
                const meanMel = computeMean(melFrames);
                const meanChroma = computeMean(chromaFrames);
                const meanContrast = computeMean(contrastFrames);
                const meanTonnetz = computeMean(tonnetzFrames);

                // Step 5: Concatenate available features
                const features: number[] = [];
                
                // Add each feature if available
                if (meanMFCC.length > 0) features.push(...meanMFCC);
                if (meanChroma.length > 0) features.push(...meanChroma);
                if (meanMel.length > 0) features.push(...meanMel);
                if (meanContrast.length > 0) features.push(...meanContrast);
                if (meanTonnetz.length > 0) features.push(...meanTonnetz);

                if (features.length === 0) {
                    throw new Error('Failed to calculate feature means');
                }

                logger.debug('Final feature vector:', {
                    featureLength: features.length,
                    mfcc: meanMFCC.length,
                    chroma: meanChroma.length,
                    mel: meanMel.length,
                    contrast: meanContrast.length,
                    tonnetz: meanTonnetz.length,
                });

                // Step 6: Run ONNX model
                const model = await initModel();
                const inputTensor = createTensor('float32', new Float32Array(features), [1, features.length]);
                const results = await model.run({ input: inputTensor });
                const probability = (results.output.data as Float32Array)[0];
                const isCrying = probability > threshold;

                logger.debug('Cry detection result', { probability, isCrying });

                return { probability, isCrying, timestamp };
            } catch (error) {
                logger.error('Manual cry detection error', { 
                    error,
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
                onError?.(error instanceof Error ? error : new Error('Manual cry detection failed'));
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
                            params: { type: "hann", size: frameSize, zeroPadding: n_fft - frameSize },
                        },
                        { name: "Spectrum", params: { size: n_fft } },
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
    const computeMean = (frames: number[][]): number[] => {
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