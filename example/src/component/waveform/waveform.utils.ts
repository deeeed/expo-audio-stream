import { Bar, Point } from './waveform.types';

const MAX_8BIT = 128; // Adjusted for signed 8-bit
const MAX_16BIT = 32768; // 2^15
const MAX_24BIT = 8388608; // 2^23
interface NormalizeValueParams {
  value: number;
  amplitude: number;
  bitDepth: number;
  debug?: boolean;
}

export const normalizeValue = ({
  value,
  amplitude,
  bitDepth,
  debug = false,
}: NormalizeValueParams): number => {
  let normalizedValue: number;

  switch (bitDepth) {
    case 8:
      normalizedValue = (value / MAX_8BIT) * amplitude;
      break;
    case 16:
      normalizedValue = (value / MAX_16BIT) * amplitude;
      break;
    case 24:
      normalizedValue = (value / MAX_24BIT) * amplitude;
      break;
    default:
      throw new Error('Unsupported bit depth');
  }

  if (debug) {
    console.log(
      `Normalize Value: input=${value}, amplitude=${amplitude}, bitDepth=${bitDepth}, result=${normalizedValue}`
    );
  }

  return normalizedValue;
};

export const amplitudeToDecibels = (
  amplitude: number,
  bitDepth: number
): number => {
  const reference = Math.pow(2, bitDepth - 1) - 1;
  if (amplitude === 0) return -Infinity; // Handle log(0) case
  return 20 * Math.log10(Math.abs(amplitude) / reference);
};

interface DownsampleParams {
  data: Float32Array;
  samplesPerPoint: number;
}

export const downsampleAverage = ({ data, samplesPerPoint }: DownsampleParams): Float32Array => {
    const downsampled = new Float32Array(Math.ceil(data.length / samplesPerPoint));
    for (let i = 0; i < downsampled.length; i++) {
        const start = i * samplesPerPoint;
        const end = Math.min(start + samplesPerPoint, data.length);
        let sum = 0;
        for (let j = start; j < end; j++) {
            sum += data[j];
        }
        downsampled[i] = sum / (end - start);
    }
    return downsampled;
};
export const downsampleAverage2 = ({ data, samplesPerPoint }: DownsampleParams): Float32Array => {
  const downsampled = new Float32Array(Math.ceil(data.length / samplesPerPoint));
  for (let i = 0; i < downsampled.length; i++) {
      const start = i * samplesPerPoint;
      const end = Math.min(start + samplesPerPoint, data.length);
      let sum = 0;
      for (let j = start; j < end; j++) {
          sum += data[j];
      }
      downsampled[i] = sum / (end - start);
  }

  // Normalization
  const maxVal = Math.max(...downsampled);
  const minVal = Math.min(...downsampled);
  const range = maxVal - minVal;

  return downsampled.map(val => (val - minVal) / range);
};

export const downsamplePeak = ({ data, samplesPerPoint }: DownsampleParams): { min: Float32Array, max: Float32Array } => {
  const totalPoints = Math.ceil(data.length / samplesPerPoint);
  const downsampledMin = new Float32Array(totalPoints);
  const downsampledMax = new Float32Array(totalPoints);
  
  for (let i = 0; i < totalPoints; i++) {
    const start = i * samplesPerPoint;
    const end = Math.min(start + samplesPerPoint, data.length);
    let max = -Infinity;
    let min = Infinity;
    for (let j = start; j < end; j++) {
      if (data[j] > max) max = data[j];
      if (data[j] < min) min = data[j];
    }
    downsampledMin[i] = min;
    downsampledMax[i] = max;
  }
  
  return { min: downsampledMin, max: downsampledMax };
};


export const downsampleRMSUnscaled = ({ data, samplesPerPoint }: DownsampleParams): Float32Array => {
  const downsampled = new Float32Array(Math.ceil(data.length / samplesPerPoint));
  for (let i = 0; i < downsampled.length; i++) {
      const start = i * samplesPerPoint;
      const end = Math.min(start + samplesPerPoint, data.length);
      let sum = 0;
      for (let j = start; j < end; j++) {
          sum += data[j] * data[j];
      }
      downsampled[i] = Math.sqrt(sum / (end - start));
  }
  return downsampled;
};

export const downsampleRMS = ({ data, samplesPerPoint }: DownsampleParams): Float32Array => {
  const downsampled = new Float32Array(Math.ceil(data.length / samplesPerPoint));
  for (let i = 0; i < downsampled.length; i++) {
      const start = i * samplesPerPoint;
      const end = Math.min(start + samplesPerPoint, data.length);
      let sum = 0;
      for (let j = start; j < end; j++) {
          sum += data[j] * data[j];
      }
      downsampled[i] = Math.sqrt(sum / (end - start));
  }

  // Normalization
  const maxVal = Math.max(...downsampled);
  const minVal = Math.min(...downsampled);
  const range = maxVal - minVal;

  return downsampled.map(val => (val - minVal) / range);
};