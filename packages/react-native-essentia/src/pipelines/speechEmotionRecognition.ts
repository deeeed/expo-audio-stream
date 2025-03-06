import type { PipelineConfig } from '../types/core.types';

export const speechEmotionRecognitionPipeline: PipelineConfig = {
  preprocess: [
    { name: 'FrameCutter', params: { frameSize: 1024, hopSize: 256 } },
    { name: 'Windowing', params: { type: 'hann' } },
    { name: 'Spectrum', params: { size: 1024 } },
  ],
  features: [
    {
      name: 'MFCC',
      input: 'Spectrum',
      params: { numberCoefficients: 13 },
      postProcess: { mean: true, variance: true },
    },
    {
      name: 'PitchYinFFT',
      input: 'Spectrum',
      params: {},
      postProcess: { mean: true },
    },
    {
      name: 'RollOff', // Changed from 'SpectralRolloff'
      input: 'Spectrum',
      params: {},
      postProcess: { mean: true },
    },
  ],
  postProcess: { concatenate: true },
};
