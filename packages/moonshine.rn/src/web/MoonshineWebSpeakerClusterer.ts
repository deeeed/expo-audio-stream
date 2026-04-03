import type { MoonshineTranscriptLine } from '../types/interfaces';

type SpeakerMetadata = Pick<
  MoonshineTranscriptLine,
  'hasSpeakerId' | 'speakerId' | 'speakerIndex'
>;

type FeatureStats = {
  mean: number;
  std: number;
};

type FrameFeatures = {
  bandEnergies: number[];
  brightness: number;
  energy: number;
  pitchHz: number | null;
  pitchStrength: number;
  zcr: number;
};

type SpeakerCluster = {
  centroid: Float32Array;
  id: string;
  sampleCount: number;
  speakerIndex: number;
};

const FRAME_SIZE = 320;
const HOP_SIZE = 160;
const MIN_PITCH_HZ = 80;
const MAX_PITCH_HZ = 320;
const MIN_PITCH_STRENGTH = 0.3;
const MIN_SEGMENT_MS = 600;
const MIN_VOICED_FRAMES = 6;
const MIN_FRAME_RMS = 0.01;
const PREVIOUS_CLUSTER_BIAS = 0.03;
const DEFAULT_CLUSTER_THRESHOLD = 0.08;
const SPEAKER_BAND_FREQUENCIES = [250, 500, 1000, 2000, 3000] as const;

function computeRms(frame: Float32Array): number {
  let sumSquares = 0;
  for (let index = 0; index < frame.length; index += 1) {
    const value = frame[index] ?? 0;
    sumSquares += value * value;
  }
  return Math.sqrt(sumSquares / Math.max(1, frame.length));
}

function computeZeroCrossingRate(frame: Float32Array): number {
  if (frame.length < 2) {
    return 0;
  }
  let crossings = 0;
  for (let index = 1; index < frame.length; index += 1) {
    const previous = frame[index - 1] ?? 0;
    const current = frame[index] ?? 0;
    if ((previous >= 0 && current < 0) || (previous < 0 && current >= 0)) {
      crossings += 1;
    }
  }
  return crossings / (frame.length - 1);
}

function computeBrightness(frame: Float32Array): number {
  if (frame.length < 2) {
    return 0;
  }
  let total = 0;
  for (let index = 1; index < frame.length; index += 1) {
    total += Math.abs((frame[index] ?? 0) - (frame[index - 1] ?? 0));
  }
  return total / (frame.length - 1);
}

function estimatePitch(
  frame: Float32Array,
  sampleRate: number
): { pitchHz: number | null; strength: number } {
  const minLag = Math.max(1, Math.floor(sampleRate / MAX_PITCH_HZ));
  const maxLag = Math.max(minLag + 1, Math.floor(sampleRate / MIN_PITCH_HZ));
  let bestLag = 0;
  let bestScore = 0;
  let energy = 0;

  for (let index = 0; index < frame.length; index += 1) {
    const sample = frame[index] ?? 0;
    energy += sample * sample;
  }
  if (energy <= 0) {
    return { pitchHz: null, strength: 0 };
  }

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    for (let index = 0; index + lag < frame.length; index += 1) {
      correlation += (frame[index] ?? 0) * (frame[index + lag] ?? 0);
    }
    if (correlation > bestScore) {
      bestScore = correlation;
      bestLag = lag;
    }
  }

  const strength = bestScore / energy;
  if (!bestLag || strength < MIN_PITCH_STRENGTH) {
    return { pitchHz: null, strength };
  }

  return {
    pitchHz: sampleRate / bestLag,
    strength,
  };
}

function computeBandEnergies(
  frame: Float32Array,
  sampleRate: number
): number[] {
  const energies = SPEAKER_BAND_FREQUENCIES.map((frequency) => {
    const omega = (2 * Math.PI * frequency) / sampleRate;
    const coefficient = 2 * Math.cos(omega);
    let previous = 0;
    let previous2 = 0;

    for (let index = 0; index < frame.length; index += 1) {
      const current =
        (frame[index] ?? 0) + coefficient * previous - previous2;
      previous2 = previous;
      previous = current;
    }

    return Math.max(
      0,
      previous2 * previous2 +
        previous * previous -
        coefficient * previous * previous2
    );
  });

  let total = 0;
  for (const energy of energies) {
    total += energy;
  }

  if (total <= 0) {
    return energies.map(() => 0);
  }

  return energies.map((energy) => energy / total);
}

function computeStats(values: number[]): FeatureStats {
  if (values.length === 0) {
    return { mean: 0, std: 0 };
  }

  let total = 0;
  for (const value of values) {
    total += value;
  }
  const mean = total / values.length;

  let variance = 0;
  for (const value of values) {
    const delta = value - mean;
    variance += delta * delta;
  }

  return {
    mean,
    std: Math.sqrt(variance / values.length),
  };
}

function normalizeVector(values: number[]): Float32Array {
  const vector = new Float32Array(values);
  let sumSquares = 0;
  for (const value of vector) {
    sumSquares += value * value;
  }

  const norm = Math.sqrt(sumSquares);
  if (norm <= 0) {
    return vector;
  }

  for (let index = 0; index < vector.length; index += 1) {
    vector[index] = (vector[index] ?? 0) / norm;
  }
  return vector;
}

function cosineDistance(left: Float32Array, right: Float32Array): number {
  if (left.length === 0 || left.length !== right.length) {
    return 1;
  }
  let dot = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += (left[index] ?? 0) * (right[index] ?? 0);
  }
  return 1 - dot;
}

function createSpeakerMetadata(cluster: SpeakerCluster): SpeakerMetadata {
  return {
    hasSpeakerId: true,
    speakerId: cluster.id,
    speakerIndex: cluster.speakerIndex,
  };
}

function updateCentroid(
  centroid: Float32Array,
  embedding: Float32Array,
  sampleCount: number
): Float32Array {
  const nextCentroid = new Float32Array(centroid.length);
  const oldWeight = sampleCount / (sampleCount + 1);
  const newWeight = 1 / (sampleCount + 1);
  for (let index = 0; index < centroid.length; index += 1) {
    nextCentroid[index] =
      (centroid[index] ?? 0) * oldWeight + (embedding[index] ?? 0) * newWeight;
  }
  return normalizeVector(Array.from(nextCentroid));
}

function extractEmbedding(
  samples: Float32Array,
  sampleRate: number
): Float32Array | null {
  if (samples.length === 0 || (samples.length / sampleRate) * 1000 < MIN_SEGMENT_MS) {
    return null;
  }

  const frames: FrameFeatures[] = [];
  for (let offset = 0; offset + FRAME_SIZE <= samples.length; offset += HOP_SIZE) {
    const frame = samples.subarray(offset, offset + FRAME_SIZE);
    const energy = computeRms(frame);
    if (energy < MIN_FRAME_RMS) {
      continue;
    }
    const { pitchHz, strength } = estimatePitch(frame, sampleRate);
    frames.push({
      bandEnergies: computeBandEnergies(frame, sampleRate),
      brightness: computeBrightness(frame),
      energy,
      pitchHz,
      pitchStrength: strength,
      zcr: computeZeroCrossingRate(frame),
    });
  }

  if (frames.length < MIN_VOICED_FRAMES) {
    return null;
  }

  const pitchedFrames = frames.filter((frame) => frame.pitchHz != null);
  const pitchStats = computeStats(
    pitchedFrames.map((frame) => (frame.pitchHz ?? 0) / MAX_PITCH_HZ)
  );
  const pitchStrengthStats = computeStats(
    pitchedFrames.map((frame) => frame.pitchStrength)
  );
  const energyStats = computeStats(
    frames.map((frame) => Math.log10(frame.energy + 1e-6) + 4)
  );
  const zcrStats = computeStats(frames.map((frame) => frame.zcr));
  const brightnessStats = computeStats(frames.map((frame) => frame.brightness * 4));
  const voicedRatio = pitchedFrames.length / frames.length;
  const bandMeans = SPEAKER_BAND_FREQUENCIES.map((_, bandIndex) =>
    frames.reduce(
      (total, frame) => total + (frame.bandEnergies[bandIndex] ?? 0),
      0
    ) / frames.length
  );

  return normalizeVector([
    pitchStats.mean,
    pitchStats.std,
    pitchStrengthStats.mean,
    pitchStrengthStats.std,
    energyStats.mean / 4,
    energyStats.std / 2,
    zcrStats.mean,
    zcrStats.std,
    brightnessStats.mean,
    brightnessStats.std,
    voicedRatio,
    ...bandMeans,
  ]);
}

export class MoonshineWebSpeakerClusterer {
  private clusters: SpeakerCluster[] = [];
  private nextSpeakerIndex = 0;
  private previousClusterId: string | null = null;

  public constructor(
    private readonly clusterThreshold = DEFAULT_CLUSTER_THRESHOLD
  ) {}

  public assign(
    samples: Float32Array | number[],
    sampleRate: number
  ): SpeakerMetadata | undefined {
    const embedding = extractEmbedding(
      samples instanceof Float32Array ? samples : Float32Array.from(samples),
      sampleRate
    );

    if (!embedding) {
      const previous = this.getPreviousCluster();
      return previous ? createSpeakerMetadata(previous) : undefined;
    }

    let bestCluster: SpeakerCluster | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const cluster of this.clusters) {
      let distance = cosineDistance(embedding, cluster.centroid);
      if (cluster.id === this.previousClusterId) {
        distance = Math.max(0, distance - PREVIOUS_CLUSTER_BIAS);
      }
      if (distance < bestDistance) {
        bestDistance = distance;
        bestCluster = cluster;
      }
    }

    let selectedCluster = bestCluster;
    if (!selectedCluster || bestDistance > this.clusterThreshold) {
      selectedCluster = {
        centroid: embedding,
        id: `web-speaker-${this.nextSpeakerIndex + 1}`,
        sampleCount: 1,
        speakerIndex: this.nextSpeakerIndex,
      };
      this.clusters.push(selectedCluster);
      this.nextSpeakerIndex += 1;
    } else {
      selectedCluster.centroid = updateCentroid(
        selectedCluster.centroid,
        embedding,
        selectedCluster.sampleCount
      );
      selectedCluster.sampleCount += 1;
    }

    this.previousClusterId = selectedCluster.id;
    return createSpeakerMetadata(selectedCluster);
  }

  private getPreviousCluster(): SpeakerCluster | null {
    if (!this.previousClusterId) {
      return null;
    }
    return (
      this.clusters.find((cluster) => cluster.id === this.previousClusterId) ??
      null
    );
  }
}
