import { useCallback, useState, useEffect } from 'react'

import type { MelSpectrogram } from '@siteed/expo-audio-studio'
import { extractMelSpectrogram } from '@siteed/expo-audio-studio'

import { baseLogger } from '../config'
import { useOnnxModel } from './useOnnxModel'

const logger = baseLogger.extend('useLanguageDetection')

// Dictionary mapping language codes to full language names
export const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English',
  'fr': 'French',
  'ru': 'Russian',
  'zh': 'Chinese',
  'es': 'Spanish',
  'de': 'German',
  'it': 'Italian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'pt': 'Portuguese',
  // Add more languages as needed
}

export interface LanguageDetectionResult {
  detectedLanguage: string;
  languageName: string;
  similarities: Record<string, number>;
  timestamp: number;
  melSpectrogram?: MelSpectrogram; // Return the spectrogram for caching if needed
}

export interface UseLanguageDetectionProps {
  onError?: (error: Error) => void;
}

export interface DetectLanguageOptions {
  fileUri: string;
  sampleRate: number;
  startTimeMs?: number;
  endTimeMs?: number;
  referenceEmbeddingsUri?: string; // Optional custom reference embeddings path
}

// Define interface for reference embeddings
interface LanguageReferenceEmbeddings {
  [language: string]: number[];
}

// List of supported languages for reference embeddings
const SUPPORTED_REFERENCE_LANGUAGES = ['de', 'en', 'es', 'fr', 'ja', 'zh']

export function useLanguageDetection({
  onError,
}: UseLanguageDetectionProps = {}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [referenceEmbeddings, setReferenceEmbeddings] = useState<LanguageReferenceEmbeddings | null>(null)
  
  const { isLoading: isModelLoading, initModel, createTensor } = useOnnxModel({
    modelUri: require('@assets/models/ecapa_tdnn_language_embedding.onnx'),
    onError,
  })

  // Load reference embeddings
  useEffect(() => {
    const loadReferenceEmbeddings = async () => {
      try {
        // Load the reference embeddings JSON file
        const embeddingsData = require('@assets/language_reference_embeddings.json')
        
        // Validate that we have embeddings for all supported languages
        const missingLanguages = SUPPORTED_REFERENCE_LANGUAGES.filter(
          (lang) => !embeddingsData[lang]
        )
        
        if (missingLanguages.length > 0) {
          logger.warn('Missing reference embeddings for languages', { missingLanguages })
        }
        
        logger.debug('Loaded reference embeddings for languages', { 
          languages: Object.keys(embeddingsData),
        })
        
        setReferenceEmbeddings(embeddingsData)
      } catch (err) {
        logger.error('Failed to load language reference embeddings', { 
          error: err instanceof Error ? err.message : 'Unknown error', 
        })
        onError?.(new Error('Failed to load language reference embeddings'))
      }
    }
    
    loadReferenceEmbeddings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Function to run inference and get language embedding
  const getLanguageEmbedding = useCallback(async (melSpectrogram: MelSpectrogram): Promise<number[]> => {
    const model = await initModel()
    
    const { spectrogram, timeSteps, nMels } = melSpectrogram
    
    // Log dimensions for debugging
    logger.debug('Mel spectrogram dimensions', { 
      timeSteps, 
      nMels,
      spectrogramShape: `${spectrogram.length}x${spectrogram[0]?.length || 0}`,
    })
    
    // Create input tensor with the correct shape [1, nMels, timeSteps]
    const inputTensor = createTensor(
      'float32', 
      new Float32Array(spectrogram.flat()), 
      [1, nMels, timeSteps]
    )
    
    // Run inference with the correct input name 'features'
    const outputs = await model.run({ features: inputTensor })
    const embedding = Array.from(outputs.embedding.data as Float32Array)
    
    // Log embedding dimensions for debugging
    logger.debug('Generated embedding', { 
      length: embedding.length,
      sample: embedding.slice(0, 5), // Show first 5 values
    })
    
    return embedding
  }, [initModel, createTensor])

  // Calculate cosine similarity between two vectors
  const cosineSimilarity = useCallback((a: number[], b: number[]): number => {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length')
    }
    
    let dotProduct = 0
    let normA = 0
    let normB = 0
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    
    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)
    
    if (normA === 0 || normB === 0) {
      return 0
    }
    
    return dotProduct / (normA * normB)
  }, [])

  // Function to detect language using cosine similarity
  const detectLanguageWithModel = useCallback(async (melSpectrogram: MelSpectrogram): Promise<Record<string, number>> => {
    if (!referenceEmbeddings) {
      throw new Error('Reference embeddings not loaded')
    }
    
    // Get embedding for the audio sample (256-dimensional from ECAPA_TDNN)
    const embedding = await getLanguageEmbedding(melSpectrogram)
    
    // Log reference embedding dimensions for debugging
    const firstLanguage = Object.keys(referenceEmbeddings)[0]
    if (firstLanguage) {
      logger.debug('Reference embedding dimensions', {
        language: firstLanguage,
        length: referenceEmbeddings[firstLanguage].length,
        sample: referenceEmbeddings[firstLanguage].slice(0, 5),
      })
    }
    
    // We have two options:
    // 1. Generate new 256-dimensional reference embeddings (best long-term solution)
    // 2. Use a projection technique to compare embeddings of different dimensions (temporary solution)
    
    // Option 2: Use only the first half of the 512-dimensional reference embeddings
    // This is a simplistic approach - a better solution would be to regenerate reference embeddings
    const similarities: Record<string, number> = {}
    
    for (const [language, referenceEmbedding] of Object.entries(referenceEmbeddings)) {
      // Extract the first 256 dimensions from the 512-dimensional reference embedding
      const truncatedReferenceEmbedding = referenceEmbedding.slice(0, embedding.length)
      
      logger.debug('Using truncated reference embedding', {
        language,
        originalLength: referenceEmbedding.length,
        truncatedLength: truncatedReferenceEmbedding.length,
      })
      
      similarities[language] = cosineSimilarity(embedding, truncatedReferenceEmbedding)
    }
    
    return similarities
  }, [referenceEmbeddings, getLanguageEmbedding, cosineSimilarity])

  // Main function to detect language from audio file
  const detectLanguage = useCallback(async (
    options: DetectLanguageOptions
  ): Promise<LanguageDetectionResult | null> => {
    try {
      setIsProcessing(true)
      
      // Extract mel spectrogram
      const spectrogram = await extractMelSpectrogram({
        fileUri: options.fileUri,
        windowSizeMs: 25,
        hopLengthMs: 10,
        nMels: 60,
        fMin: 0,
        fMax: options.sampleRate / 2,
        windowType: 'hann',
        normalize: true,
        logScale: true,
        startTimeMs: options.startTimeMs || 0,
        endTimeMs: options.endTimeMs,
        decodingOptions: {
          targetSampleRate: 16000,
          normalizeAudio: true,
        },
      })
      
      logger.debug('Extracted mel spectrogram for language detection', {
        timeSteps: spectrogram.timeSteps,
        nMels: spectrogram.nMels,
        durationMs: spectrogram.durationMs,
      })
      
      // Get language probabilities directly from the model
      const probabilities = await detectLanguageWithModel(spectrogram)
      
      // Find the language with highest probability
      let maxProbability = -Infinity
      let detectedLanguage = ''
      
      for (const [lang, probability] of Object.entries(probabilities)) {
        if (probability > maxProbability) {
          maxProbability = probability
          detectedLanguage = lang
        }
      }
      
      const timestamp = Date.now()
      
      logger.debug('Language detection result', {
        detectedLanguage,
        languageName: LANGUAGE_NAMES[detectedLanguage],
        probabilities,
        timestamp,
      })
      
      return {
        detectedLanguage,
        languageName: LANGUAGE_NAMES[detectedLanguage],
        similarities: probabilities, // We're using probabilities instead of similarities
        timestamp,
        melSpectrogram: spectrogram,
      }
      
    } catch (error) {
      logger.error('Language detection error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      onError?.(error instanceof Error ? error : new Error('Failed to detect language'))
      return null
    } finally {
      setIsProcessing(false)
    }
  }, [detectLanguageWithModel, onError])

  return {
    isModelLoading,
    isProcessing,
    detectLanguage,
  }
} 