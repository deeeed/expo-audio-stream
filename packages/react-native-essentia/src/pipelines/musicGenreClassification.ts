// packages/react-native-essentia/src/pipelines/musicGenreClassification.ts
import type { PipelineConfig } from '../types/core.types';

export const musicGenreClassificationPipeline: PipelineConfig = {
  preprocess: [
    { name: 'FrameCutter', params: { frameSize: 32768, hopSize: 512 } },
    { name: 'Windowing', params: { type: 'hann' } },
    { name: 'Spectrum', params: { size: 32768 } },
  ],
  features: [
    {
      name: 'MFCC',
      input: 'Spectrum',
      params: { numberCoefficients: 13 },
      postProcess: { mean: true, variance: true },
    },
    {
      name: 'MelBands',
      input: 'Spectrum',
      params: { numberBands: 40 },
      postProcess: { mean: true, variance: true },
    },
    {
      name: 'Centroid',
      input: 'Spectrum',
      params: {},
      postProcess: { mean: true },
    },
    {
      name: 'SpectralContrast',
      input: 'Spectrum',
      params: { numberBands: 6, frameSize: 32768 }, // Explicitly set frameSize
      postProcess: { mean: true },
    },
    {
      name: 'Chromagram',
      input: 'frame',
      params: {},
      postProcess: { mean: true },
    },
    {
      name: 'ZeroCrossingRate',
      input: 'frame',
      params: {},
      postProcess: { mean: true },
    },
  ],
  // postProcess: { concatenate: true },
};
