export interface WaveformProps {
  buffer: ArrayBuffer;
  bitDepth?: number;
  sampleRate?: number;
  channels?: number;
  visualizationType?: "line" | "candlestick";
  currentTime?: number; // Current playback time in seconds
  zoomLevel?: number;
  candlesPerRulerInterval?: number;
  candleStickWidth?: number;
  waveformHeight?: number;
  candleStickSpacing?: number;
  showRuler?: boolean;
  candleColor?: string;
  mode?: "static" | "live" | "preview";
  debug?: boolean;
}

export interface Bar {
  x: number;
  height: number;
  y: number;
}
