// apps/playground/src/hooks/useCryDetector.ts
import EssentiaAPI, { ChromagramParams, MelSpectrogramParams, MFCCParams, SpectralContrastParams, TonnetzParams } from '@siteed/react-native-essentia';
import { useCallback, useState } from 'react';
import { baseLogger } from '../config';
import { useOnnxModel } from './useOnnxModel';

const logger = baseLogger.extend('useCryDetector');

export interface UseCryDetectorProps {
    onError?: (error: Error) => void;
}

export const CRY_TYPE_LABELS = [
  "belly_pain",
  "burping",
  "discomfort",
  "hungry",
  "tired",
] as const;

export type CryTypeLabel = (typeof CRY_TYPE_LABELS)[number];

export interface CryDetectionResult {
    probability: number;       // Highest probability
    isCrying: boolean;         // True if any probability exceeds threshold
    timestamp: number;         // Timestamp of detection
    classification: CryTypeLabel;  // The predicted cry type
    predictions: {      // All predictions sorted by probability
        label: CryTypeLabel;
        probability: number;
    }[];
}

export interface FeatureExtractionResult {
    features: number[];
    processingTimeMs: number;
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

    // Helper function to compute mean across frames with proper typing
    const computeMean = useCallback((data: number[][] | number[]): number[] => {
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
    }, []);

    // Individual feature extraction functions
    // 1. Extract MFCC
    const extractMFCC = useCallback(async (
        audioData: Float32Array
    ): Promise<FeatureExtractionResult> => {
        try {
            const startTime = performance.now();
            logger.debug('Extracting MFCC features');
            
            await EssentiaAPI.setAudioData(audioData, sr);
            
            const n_mfcc = 40;
            const n_mels = 128;
            
            const mfccParams: MFCCParams = {
                sampleRate: sr,
                numberCoefficients: n_mfcc,
                numberBands: n_mels,
                lowFrequencyBound: 0,
                highFrequencyBound: sr / 2,
                inputSize: fftSize,
                weighting: "warping",
                normalize: "unit_sum",
                type: "power",
                dctType: 2,
                logType: "dbamp"
            };

            const mfccResult = await EssentiaAPI.extractMFCC(mfccParams);
            
            if (!('mfcc' in mfccResult)) {
                throw new Error('MFCC extraction failed');
            }
            
            const mfcc = mfccResult.mfcc;
            const mfccMean = computeMean(mfcc);
            
            if (mfccMean.length !== n_mfcc) {
                throw new Error(`MFCC length is ${mfccMean.length}, expected ${n_mfcc}`);
            }
            
            const endTime = performance.now();
            logger.debug('MFCC extraction completed', { length: mfccMean.length });
            
            return {
                features: mfccMean,
                processingTimeMs: endTime - startTime
            };
        } catch (error) {
            logger.error('Error extracting MFCC', { error });
            onError?.(error instanceof Error ? error : new Error('MFCC extraction failed'));
            throw error;
        }
    }, [computeMean, onError]);

    // 2. Extract Mel Spectrogram
    const extractMelSpectrogram = useCallback(async (
        audioData: Float32Array
    ): Promise<FeatureExtractionResult> => {
        try {
            const startTime = performance.now();
            logger.debug('Extracting Mel Spectrogram features');
            
            await EssentiaAPI.setAudioData(audioData, sr);
            
            const n_mels = 128;
            const paddedFrameSize = 1024;
            
            const melParams: MelSpectrogramParams = {
                sampleRate: sr,
                frameSize: paddedFrameSize,
                hopSize,
                nMels: n_mels,
                fMin: 0,
                fMax: sr / 2,
                windowType: "hann",
                normalize: true,
                logScale: true,
            };

            const melResult = await EssentiaAPI.computeMelSpectrogram(melParams);
            
            if (!melResult.data?.bands) {
                throw new Error('Mel Spectrogram extraction failed');
            }
            
            const melMean = computeMean(melResult.data.bands);
            
            const endTime = performance.now();
            logger.debug('Mel Spectrogram extraction completed', { length: melMean.length });
            
            return {
                features: melMean,
                processingTimeMs: endTime - startTime
            };
        } catch (error) {
            logger.error('Error extracting Mel Spectrogram', { error });
            onError?.(error instanceof Error ? error : new Error('Mel Spectrogram extraction failed'));
            throw error;
        }
    }, [computeMean, onError]);

    // 3. Extract Chroma
    const extractChroma = useCallback(async (
        audioData: Float32Array
    ): Promise<FeatureExtractionResult> => {
        try {
            const startTime = performance.now();
            logger.debug('Extracting Chroma features');
            
            await EssentiaAPI.setAudioData(audioData, sr);
            
            const n_chroma = 12;
            
            const chromaParams: ChromagramParams = {
                sampleRate: sr,
                numberBins: n_chroma,
                binsPerOctave: 12,
                normalizeType: "unit_sum",
                minFrequency: 32.7,
            };
            
            const chromaResult = await EssentiaAPI.extractChroma(chromaParams);
            
            if (!('chroma' in chromaResult)) {
                throw new Error('Chroma extraction failed');
            }
            
            const chroma = chromaResult.chroma;
            const chromaMean = computeMean(chroma);
            
            if (chromaMean.length !== n_chroma) {
                throw new Error(`Chroma length is ${chromaMean.length}, expected ${n_chroma}`);
            }
            
            const endTime = performance.now();
            logger.debug('Chroma extraction completed', { length: chromaMean.length });
            
            return {
                features: chromaMean,
                processingTimeMs: endTime - startTime
            };
        } catch (error) {
            logger.error('Error extracting Chroma', { error });
            onError?.(error instanceof Error ? error : new Error('Chroma extraction failed'));
            throw error;
        }
    }, [computeMean, onError]);

    // 4. Extract Spectral Contrast
    const extractSpectralContrast = useCallback(async (
        audioData: Float32Array
    ): Promise<FeatureExtractionResult> => {
        try {
            const startTime = performance.now();
            logger.debug('Extracting Spectral Contrast features');
            
            await EssentiaAPI.setAudioData(audioData, sr);
            
            const n_bands = 7;
            const fmin = 100;
            const paddedFrameSize = 1024;
            const nyquist = sr / 2;
            
            const spectralContrastParams: SpectralContrastParams = {
                sampleRate: sr,
                frameSize: paddedFrameSize,
                numberBands: n_bands,
                lowFrequencyBound: fmin,
                highFrequencyBound: Math.min(11000, nyquist - 100),
            };
            
            const contrastResult = await EssentiaAPI.extractSpectralContrast(spectralContrastParams);
            
            if (!('contrast' in contrastResult) || !('valleys' in contrastResult)) {
                throw new Error('Spectral Contrast extraction failed');
            }
            
            // Get the contrast mean
            const contrastMean = computeMean(contrastResult.contrast);
            
            // Get the valleys mean
            const valleysMean = computeMean(contrastResult.valleys);
            
            // Create Python-compatible format: append the first valley mean to the contrast means
            // This mimics librosa.feature.spectral_contrast output format
            const pythonCompatibleFeatures = [
                ...contrastMean,
                valleysMean.length > 0 ? valleysMean[0] : 0 // Add first valley or 0 if no valleys
            ];
            
            const endTime = performance.now();
            logger.debug('Spectral Contrast extraction completed', { 
                rawLength: contrastMean.length,
                pythonCompatibleLength: pythonCompatibleFeatures.length
            });
            
            return {
                features: pythonCompatibleFeatures,
                processingTimeMs: endTime - startTime
            };
        } catch (error) {
            logger.error('Error extracting Spectral Contrast', { error });
            onError?.(error instanceof Error ? error : new Error('Spectral Contrast extraction failed'));
            throw error;
        }
    }, [computeMean, onError]);

    // 5. Extract Tonnetz
    const extractTonnetz = useCallback(async (
        audioData: Float32Array
    ): Promise<FeatureExtractionResult> => {
        try {
            const startTime = performance.now();
            logger.debug('Extracting Tonnetz features');
            
            await EssentiaAPI.setAudioData(audioData, sr);
            
            const paddedFrameSize = 1024;
            
            const tonnetzParams: TonnetzParams = {
                sampleRate: sr,
                frameSize: paddedFrameSize,
                hopSize,
            };
            
            const tonnetzResult = await EssentiaAPI.extractTonnetz(tonnetzParams);
            
            if (!('tonnetz' in tonnetzResult)) {
                throw new Error('Tonnetz extraction failed');
            }
            
            const tonnetzMean = computeMean(tonnetzResult.tonnetz);
            
            const endTime = performance.now();
            logger.debug('Tonnetz extraction completed', { length: tonnetzMean.length });
            
            return {
                features: tonnetzMean,
                processingTimeMs: endTime - startTime
            };
        } catch (error) {
            logger.error('Error extracting Tonnetz', { error });
            onError?.(error instanceof Error ? error : new Error('Tonnetz extraction failed'));
            throw error;
        }
    }, [computeMean, onError]);

    // 6. Run prediction with the model
    const runPrediction = useCallback(async (
        features: number[]
    ): Promise<{
        probability: number; 
        isCrying: boolean; 
        classification: CryTypeLabel;
        predictions: { label: CryTypeLabel; probability: number }[];
        processingTimeMs: number
    }> => {
        try {
            const startTime = performance.now();
            logger.debug('Running model prediction', { featureLength: features.length });
            
            if (features.length !== 194) {
                throw new Error(`Expected 194 features, got ${features.length}`);
            }
            
            const model = await initModel();
            const inputTensor = createTensor('float32', new Float32Array(features), [1, features.length]);
            
            // Run the model with the correct input name
            const results = await model.run({ float_input: inputTensor });
            
            // Debug log the results structure to help identify output names
            logger.debug('Model results structure', { keys: Object.keys(results) });
            
            // Get probabilities and label outputs
            const probabilitiesKey = 'probabilities';
            const labelKey = 'label';
            
            if (!results[probabilitiesKey] || !results[labelKey]) {
                throw new Error('Model did not return expected outputs');
            }
            
            // Get the raw logits/probabilities
            const logits = Array.from(results[probabilitiesKey].data as Float32Array);
            const predictedLabelIndex = Number(results[labelKey].data[0]);
            
            // Apply softmax to convert logits to probabilities
            const maxLogit = Math.max(...logits);
            const expValues = logits.map(x => Math.exp(x - maxLogit));
            const sumExp = expValues.reduce((a, b) => a + b, 0);
            const probabilities = expValues.map(x => x / sumExp);
            
            // Get the highest probability
            const maxProbability = Math.max(...probabilities);
            const isCrying = maxProbability > threshold;
            
            // Map probabilities to labels and sort
            const predictions = probabilities
                .map((prob, idx) => ({
                    label: CRY_TYPE_LABELS[idx],
                    probability: prob
                }))
                .sort((a, b) => b.probability - a.probability);
            
            // Get the predicted class
            const classification = CRY_TYPE_LABELS[predictedLabelIndex];
            
            const endTime = performance.now();
            logger.debug('Prediction completed', { 
                probability: maxProbability, 
                isCrying, 
                classification,
                predictions: predictions.slice(0, 3) // Log top 3 predictions
            });
            
            return {
                probability: maxProbability,
                isCrying,
                classification,
                predictions,
                processingTimeMs: endTime - startTime
            };
        } catch (error) {
            logger.error('Error running prediction', { error });
            onError?.(error instanceof Error ? error : new Error('Model prediction failed'));
            throw error;
        }
    }, [initModel, createTensor, onError]);

    // Modified detectCryManually to use the individual functions
    const detectCryManually = useCallback(
        async (
            audioData: Float32Array,
            timestamp: number = Date.now()
        ): Promise<CryDetectionResult | null> => {
            try {
                setIsProcessing(true);
                logger.debug('Starting manual cry detection');
    
                // Extract all features
                const mfccResult = await extractMFCC(audioData);
                const melResult = await extractMelSpectrogram(audioData);
                const chromaResult = await extractChroma(audioData);
                const contrastResult = await extractSpectralContrast(audioData);
                const tonnetzResult = await extractTonnetz(audioData);
                
                // Log individual feature lengths with expected counts
                logger.debug('Feature counts:', {
                    mfcc: {
                        actual: mfccResult.features.length,
                        expected: 40
                    },
                    chroma: {
                        actual: chromaResult.features.length,
                        expected: 12
                    },
                    mel: {
                        actual: melResult.features.length,
                        expected: 128
                    },
                    contrast: {
                        actual: contrastResult.features.length,
                        expected: 8  // n_bands (7) + 1
                    },
                    tonnetz: {
                        actual: tonnetzResult.features.length,
                        expected: 6
                    }
                });
                
                // Concatenate features in the same order as Python
                const features: number[] = [
                    ...mfccResult.features, 
                    ...chromaResult.features, 
                    ...melResult.features, 
                    ...contrastResult.features, 
                    ...tonnetzResult.features
                ];
                
                // Log total concatenated feature length
                logger.debug('Total features length', { 
                    total: features.length,
                    expected: 194 // The expected length from the error check in runPrediction
                });
                
                // Run prediction
                const predictionResult = await runPrediction(features);
    
                logger.debug('Cry detection completed');
    
                return { 
                    probability: predictionResult.probability, 
                    isCrying: predictionResult.isCrying, 
                    timestamp,
                    classification: predictionResult.classification,
                    predictions: predictionResult.predictions
                };
            } catch (error) {
                logger.error('Error in cry detection', { error });
                onError?.(error instanceof Error ? error : new Error('Cry detection failed'));
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        [extractMFCC, extractMelSpectrogram, extractChroma, extractSpectralContrast, extractTonnetz, runPrediction, onError]
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
                const results = await model.run({ float_input: inputTensor });
                
                // Get probabilities and label outputs
                const probabilitiesKey = 'probabilities';
                const labelKey = 'label';
                
                if (!results[probabilitiesKey] || !results[labelKey]) {
                    throw new Error('Model did not return expected outputs');
                }
                
                // Get the raw logits/probabilities
                const logits = Array.from(results[probabilitiesKey].data as Float32Array);
                const predictedLabelIndex = Number(results[labelKey].data[0]);
                
                // Apply softmax to convert logits to probabilities
                const maxLogit = Math.max(...logits);
                const expValues = logits.map(x => Math.exp(x - maxLogit));
                const sumExp = expValues.reduce((a, b) => a + b, 0);
                const probabilities = expValues.map(x => x / sumExp);
                
                // Get the highest probability
                const maxProbability = Math.max(...probabilities);
                const isCrying = maxProbability > threshold;
                
                // Map probabilities to labels and sort
                const predictionResults = probabilities
                    .map((prob, idx) => ({
                        label: CRY_TYPE_LABELS[idx],
                        probability: prob
                    }))
                    .sort((a, b) => b.probability - a.probability);
                
                // Get the predicted class
                const classification = CRY_TYPE_LABELS[predictedLabelIndex];

                logger.debug('Cry detection result', { 
                    probability: maxProbability, 
                    isCrying, 
                    classification,
                    predictions: predictionResults.slice(0, 3)
                });

                return { 
                    probability: maxProbability, 
                    isCrying, 
                    timestamp,
                    classification,
                    predictions: predictionResults
                };
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

    return {
        isModelLoading,
        isProcessing,
        detectCryManually,
        detectCryWithPipeline,
        // Export individual feature extraction functions
        extractMFCC,
        extractMelSpectrogram,
        extractChroma,
        extractSpectralContrast,
        extractTonnetz,
        runPrediction
    };
}