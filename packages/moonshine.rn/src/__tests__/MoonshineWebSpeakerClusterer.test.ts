import { MoonshineWebSpeakerClusterer } from '../web/MoonshineWebSpeakerClusterer';

const SAMPLE_RATE = 16000;

function createVoiceLikeSegment(
  fundamentalHz: number,
  brightness = 0.4,
  durationMs = 1400,
  noiseAmount = 0
): Float32Array {
  const sampleCount = Math.floor((SAMPLE_RATE * durationMs) / 1000);
  const samples = new Float32Array(sampleCount);

  for (let index = 0; index < sampleCount; index += 1) {
    const t = index / SAMPLE_RATE;
    const envelope =
      0.25 + 0.75 * Math.max(0, Math.sin(2 * Math.PI * 2.3 * t));
    const fundamental = Math.sin(2 * Math.PI * fundamentalHz * t);
    const harmonic2 = Math.sin(2 * Math.PI * fundamentalHz * 2 * t) * brightness;
    const harmonic3 =
      Math.sin(2 * Math.PI * fundamentalHz * 3 * t) * brightness * 0.5;
    const pseudoNoise =
      noiseAmount > 0
        ? (Math.sin(2 * Math.PI * 911 * t) + Math.sin(2 * Math.PI * 1237 * t)) *
          noiseAmount
        : 0;
    samples[index] =
      (fundamental + harmonic2 + harmonic3 + pseudoNoise) * envelope * 0.25;
  }

  return samples;
}

describe('MoonshineWebSpeakerClusterer', () => {
  it('keeps similar voice segments in the same cluster', () => {
    const clusterer = new MoonshineWebSpeakerClusterer();

    const first = clusterer.assign(
      createVoiceLikeSegment(145, 0.35),
      SAMPLE_RATE
    );
    const second = clusterer.assign(
      createVoiceLikeSegment(150, 0.37),
      SAMPLE_RATE
    );

    expect(first?.hasSpeakerId).toBe(true);
    expect(second?.hasSpeakerId).toBe(true);
    expect(first?.speakerIndex).toBe(0);
    expect(second?.speakerIndex).toBe(0);
    expect(second?.speakerId).toBe(first?.speakerId);
  });

  it('creates a new cluster for a sufficiently different voice segment', () => {
    const clusterer = new MoonshineWebSpeakerClusterer(0.04);

    const first = clusterer.assign(
      createVoiceLikeSegment(120, 0.2),
      SAMPLE_RATE
    );
    const second = clusterer.assign(
      createVoiceLikeSegment(680, 0.1, 1400, 0.8),
      SAMPLE_RATE
    );

    expect(first?.speakerIndex).toBe(0);
    expect(second?.speakerIndex).toBe(1);
    expect(second?.speakerId).not.toBe(first?.speakerId);
  });
});
