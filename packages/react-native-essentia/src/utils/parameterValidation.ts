import { ESSENTIA_ALGORITHMS } from '../types/algorithms.types';
import type { AlgorithmParams } from '../types/core.types';

// Define the supported parameters for each algorithm
export const ALGORITHM_SUPPORTED_PARAMS: Record<string, string[]> = {
  // Spectral algorithms
  [ESSENTIA_ALGORITHMS.MFCC]: [
    'weighting',
    'warpingFormula',
    'type',
    'sampleRate',
    'normalize',
    'lowFrequencyBound',
    'liftering',
    'silenceThreshold',
    'logType',
    'inputSize',
    'highFrequencyBound',
    'numberCoefficients',
    'numberBands',
    'dctType',
  ],
  [ESSENTIA_ALGORITHMS.MelBands]: [
    'type',
    'sampleRate',
    'numberBands',
    'weighting',
    'normalize',
    'lowFrequencyBound',
    'log',
    'warpingFormula',
    'inputSize',
    'highFrequencyBound',
  ],
  [ESSENTIA_ALGORITHMS.BarkBands]: ['sampleRate', 'numberBands'],
  [ESSENTIA_ALGORITHMS.SpectralContrast]: [
    'staticDistribution',
    'sampleRate',
    'numberBands',
    'neighbourRatio',
    'highFrequencyBound',
    'lowFrequencyBound',
    'frameSize',
  ],

  // Tonal algorithms
  [ESSENTIA_ALGORITHMS.Key]: [
    'usePolyphony',
    'useMajMin',
    'pcpSize',
    'useThreeChords',
    'slope',
    'profileType',
    'numHarmonics',
  ],
  [ESSENTIA_ALGORITHMS.Tonnetz]: [
    'frameSize',
    'hopSize',
    'hpcpSize',
    'referenceFrequency',
    'computeMean',
  ],

  // Rhythm algorithms
  [ESSENTIA_ALGORITHMS.PercivalBpmEstimator]: [
    'maxBPM',
    'minBPM',
    'hopSizeOSS',
    'sampleRate',
    'hopSize',
    'frameSizeOSS',
    'frameSize',
  ],
  [ESSENTIA_ALGORITHMS.BeatTrackerMultiFeature]: ['minTempo', 'maxTempo'],
  [ESSENTIA_ALGORITHMS.BeatTrackerDegara]: ['minTempo', 'maxTempo'],
  [ESSENTIA_ALGORITHMS.NoveltyCurve]: [
    'frameSize',
    'hopSize',
    'kernelSize',
    'normalize',
    'weightCurve',
    'sampleRate',
  ],

  // Signal processing algorithms
  [ESSENTIA_ALGORITHMS.PitchYinFFT]: [
    'sampleRate',
    'minFrequency',
    'tolerance',
    'frameSize',
    'maxFrequency',
    'interpolate',
  ],
  [ESSENTIA_ALGORITHMS.Spectrum]: ['size'],
  [ESSENTIA_ALGORITHMS.FFT]: ['size'],
  [ESSENTIA_ALGORITHMS.Windowing]: [
    'zeroPhase',
    'type',
    'zeroPadding',
    'size',
    'normalized',
  ],

  // Audio analysis algorithms
  [ESSENTIA_ALGORITHMS.Loudness]: [], // No specific parameters
  [ESSENTIA_ALGORITHMS.Energy]: [], // No specific parameters
  [ESSENTIA_ALGORITHMS.ZeroCrossingRate]: ['threshold'],
  [ESSENTIA_ALGORITHMS.Dissonance]: [], // No specific parameters
  [ESSENTIA_ALGORITHMS.DynamicComplexity]: ['sampleRate', 'frameSize'],

  // Additional algorithms can be added as needed
};

/**
 * Validates and filters parameters for a specific algorithm
 * @param algorithmName Name of the algorithm
 * @param params Parameters to validate
 * @returns A filtered object containing only supported parameters
 */
export function validateAlgorithmParams(
  algorithmName: string,
  params: AlgorithmParams = {}
): AlgorithmParams {
  const supportedParams = ALGORITHM_SUPPORTED_PARAMS[algorithmName] || [];
  const validatedParams: AlgorithmParams = {};

  // If no supported params are defined for this algorithm, return params as is
  if (
    supportedParams.length === 0 &&
    !ALGORITHM_SUPPORTED_PARAMS[algorithmName]
  ) {
    console.warn(
      `No parameter validation defined for algorithm '${algorithmName}'. Using parameters as-is.`
    );

    // Still ensure framewise is not included, as it causes issues with various algorithms
    const cleanedParams = { ...params };
    if ('framewise' in cleanedParams) {
      console.warn(
        `Removing potentially problematic 'framewise' parameter from ${algorithmName}`
      );
      delete cleanedParams.framewise;
    }

    return cleanedParams;
  }

  // Filter params to only include supported ones
  Object.entries(params).forEach(([key, value]) => {
    if (supportedParams.includes(key)) {
      validatedParams[key] = value;
    } else {
      // Special case for framewise which causes serialization issues
      if (key === 'framewise') {
        console.warn(
          `Removing unsupported 'framewise' parameter which could cause JSON serialization issues`
        );
      } else {
        console.warn(
          `Parameter '${key}' is not supported by the ${algorithmName} algorithm and will be ignored.`
        );
      }
    }
  });

  return validatedParams;
}

/**
 * Gets the list of supported parameters for a specific algorithm
 * @param algorithmName Name of the algorithm
 * @returns Array of supported parameter names
 */
export function getSupportedParams(algorithmName: string): string[] {
  return ALGORITHM_SUPPORTED_PARAMS[algorithmName] || [];
}

/**
 * Checks if a parameter is supported by a specific algorithm
 * @param algorithmName Name of the algorithm
 * @param paramName Name of the parameter to check
 * @returns True if the parameter is supported
 */
export function isParameterSupported(
  algorithmName: string,
  paramName: string
): boolean {
  const supportedParams = ALGORITHM_SUPPORTED_PARAMS[algorithmName] || [];
  return supportedParams.includes(paramName);
}
