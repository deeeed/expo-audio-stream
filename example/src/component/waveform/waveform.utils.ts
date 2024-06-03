import { Bar } from './waveform.types';

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

// Define the fixed intervals based on zoom level
export const getRulerInterval = (
  zoomLevel: number,
  duration: number,
  width: number,
  mode: string
) => {
  if (mode === 'preview') {
    const minInterval = duration / (width / 50); // Approx 50 pixels per interval
    if (minInterval >= 30) return 30;
    if (minInterval >= 5) return 5;
    if (minInterval >= 1) return 1;
    if (minInterval >= 0.5) return 0.5;
    return 0.1;
  } else {
    if (zoomLevel >= 10) return 0.1;
    if (zoomLevel >= 5) return 0.5;
    if (zoomLevel >= 2) return 1;
    if (zoomLevel >= 1) return 5;
    return 30;
  }
};

interface MinMaxAverageParams {
  data: Int16Array;
  totalCandles: number;
  samplesPerCandle: number;
}

interface GenerateBarsParams {
  data: Int16Array;
  totalCandles: number;
  samplesPerCandle: number;
  minAverage: number;
  maxAverage: number;
  waveformHeight: number;
  parentWidth: number;
}

export const calculateMinMaxAverage = ({
  data,
  totalCandles,
  samplesPerCandle,
}: MinMaxAverageParams): [number, number] => {
  let minAverage = Infinity;
  let maxAverage = -Infinity;

  for (let i = 0; i < totalCandles; i++) {
    const startSample = Math.floor(i * samplesPerCandle);
    const endSample = Math.min(startSample + samplesPerCandle, data.length);

    let min = Infinity;
    let max = -Infinity;
    for (let j = startSample; j < endSample; j++) {
      if (data[j] < min) min = data[j];
      if (data[j] > max) max = data[j];
    }

    if (min < minAverage) minAverage = min;
    if (max > maxAverage) maxAverage = max;
  }

  return [minAverage, maxAverage];
};

export const generateBars = ({
  data,
  totalCandles,
  samplesPerCandle,
  minAverage,
  waveformHeight,
  maxAverage,
  parentWidth,
}: GenerateBarsParams): Bar[] => {
  const bars: Bar[] = [];

  for (let i = 0; i < totalCandles; i++) {
    const startSample = Math.floor(i * samplesPerCandle);
    const endSample = Math.min(startSample + samplesPerCandle, data.length);

    let min = Infinity;
    let max = -Infinity;
    for (let j = startSample; j < endSample; j++) {
      if (data[j] < min) min = data[j];
      if (data[j] > max) max = data[j];
    }

    const height = ((max - min) / (maxAverage - minAverage)) * waveformHeight;
    const x = (i * parentWidth) / totalCandles;
    const y = waveformHeight / 2 - height / 2;

    bars.push({ x, height, y });
  }

  return bars;
};

export const amplitudeToDecibels = (
  amplitude: number,
  bitDepth: number
): number => {
  const reference = Math.pow(2, bitDepth - 1) - 1;
  if (amplitude === 0) return -Infinity; // Handle log(0) case
  return 20 * Math.log10(Math.abs(amplitude) / reference);
};
