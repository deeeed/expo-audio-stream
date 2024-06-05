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


interface GenerateLinePointsParams {
  data: Float32Array;
  waveformHeight: number;
  totalWidth: number;
  topMargin?: number; // Optional top margin
  bottomMargin?: number; // Optional bottom margin
}

export const generateLinePoints = ({
  data,
  waveformHeight,
  totalWidth,
  topMargin = 30, // Default 30px top margin
  bottomMargin = 30, // Default 30px bottom margin
}: GenerateLinePointsParams): Point[] => {
  const totalPoints = data.length;
  const linePoints: Point[] = [];

  const effectiveHeight = waveformHeight - topMargin - bottomMargin;
  const min = Math.min(...data);
  const max = Math.max(...data);

  for (let i = 0; i < totalPoints; i++) {
    const normalizedValue = (data[i] - min) / (max - min);
    const x = (i * totalWidth) / totalPoints;
    const y = topMargin + effectiveHeight - normalizedValue * effectiveHeight;

    linePoints.push({ x, y });
  }

  console.log(`Generated ${linePoints.length} line points`, linePoints);

  return linePoints;
};
