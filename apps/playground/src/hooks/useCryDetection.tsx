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

                const mfccFrames: number[][] = [];
                const melFrames: number[][] = [];
                const chromaFrames: number[][] = [];
                const contrastFrames: number[][] = [];
                const tonnetzFrames: number[][] = [];

                // Step 2: Process each frame
                for (const frame of frames.data.frame) {
                    // Windowing
                    const windowedFrame = await EssentiaAPI.executeAlgorithm("Windowing", {
                        type: "hann",
                        size: frameSize,
                        zeroPadding: n_fft - frameSize,
                        frame,
                    });

                    // Spectrum
                    const spectrumResult = await EssentiaAPI.executeAlgorithm("Spectrum", {
                        size: n_fft,
                        frame: windowedFrame.data.frame,
                    });
                    const spectrum = spectrumResult.data.spectrum;

                    // MFCC
                    const mfccResult = await EssentiaAPI.executeAlgorithm("MFCC", {
                        sampleRate: sr,
                        numberBands: 128,
                        numberCoefficients: 40,
                        warpingFormula: "htkMel",
                        type: "power",
                        lowFrequencyBound: 0,
                        highFrequencyBound: sr / 2,
                        spectrum,
                    });
                    mfccFrames.push(mfccResult.data.mfcc);

                    // Mel Spectrogram
                    const melResult = await EssentiaAPI.executeAlgorithm("MelBands", {
                        sampleRate: sr,
                        numberBands: 128,
                        type: "power",
                        log: false,
                        spectrum,
                    });
                    melFrames.push(melResult.data.melBands);

                    // Chroma
                    const chromaResult = await EssentiaAPI.executeAlgorithm("Chromagram", {
                        sampleRate: sr,
                        numberBins: 12,
                        minFrequency: 0,
                        maxFrequency: sr / 2,
                        spectrum,
                    });
                    chromaFrames.push(chromaResult.data.chroma);

                    // Spectral Contrast
                    const contrastResult = await EssentiaAPI.executeAlgorithm("SpectralContrast", {
                        sampleRate: sr,
                        numberBands: 7,
                        lowFrequencyBound: 100,
                        spectrum,
                    });
                    contrastFrames.push(contrastResult.data.spectralContrast);

                    // Tonnetz
                    const tonnetzResult = await EssentiaAPI.executeAlgorithm("Tonnetz", {
                        pcp: chromaResult.data.chroma,
                    });
                    tonnetzFrames.push(tonnetzResult.data.tonnetz);
                }

                // Step 3: Compute means
                const meanMFCC = computeMean(mfccFrames);         // 40
                const meanMel = computeMean(melFrames);           // 128
                const meanChroma = computeMean(chromaFrames);     // 12
                const meanContrast = computeMean(contrastFrames); // 7
                const meanTonnetz = computeMean(tonnetzFrames);   // 6

                // Step 4: Concatenate features
                const features = [
                    ...meanMFCC,
                    ...meanChroma,
                    ...meanMel,
                    ...meanContrast,
                    ...meanTonnetz,
                ];

                logger.debug('Extracted features', {
                    featureLength: features.length,
                    mfcc: meanMFCC.length,
                    chroma: meanChroma.length,
                    mel: meanMel.length,
                    contrast: meanContrast.length,
                    tonnetz: meanTonnetz.length,
                });

                // Step 5: Run ONNX model
                const model = await initModel();
                const inputTensor = createTensor('float32', new Float32Array(features), [1, features.length]);
                const results = await model.run({ input: inputTensor });
                const probability = (results.output.data as Float32Array)[0];
                const isCrying = probability > threshold;

                logger.debug('Cry detection result', { probability, isCrying });

                return { probability, isCrying, timestamp };
            } catch (error) {
                logger.error('Manual cry detection error', { error });
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
                            name: "Chromagram",
                            params: { sampleRate: sr, numberBins: 12, minFrequency: 0, maxFrequency: sr / 2 },
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
                            input: "Chromagram",
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

    // Helper function to compute mean across frames
    const computeMean = (frames: number[][]): number[] => {
        const numFrames = frames.length;
        const featureSize = frames[0].length;
        const mean = new Array(featureSize).fill(0);

        for (let i = 0; i < numFrames; i++) {
            for (let j = 0; j < featureSize; j++) {
                mean[j] += frames[i][j];
            }
        }

        for (let j = 0; j < featureSize; j++) {
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