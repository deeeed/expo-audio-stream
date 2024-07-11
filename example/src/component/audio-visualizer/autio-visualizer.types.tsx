// example/src/component/audio-visualizer/autio-visualizer.types.ts
import { AudioAnalysisData, DataPoint } from "@siteed/expo-audio-stream";
import { StyleProp, ViewStyle } from "react-native";
import { SharedValue } from "react-native-reanimated";

import { AudioVisualiserAction } from "./audio-visualizer";

export interface CalculateReferenceLinePositionParams {
  canvasWidth: number;
  referenceLinePosition: "MIDDLE" | "RIGHT";
}

export interface GetStylesParams {
  screenWidth: number;
  canvasWidth: number;
  referenceLineX: number;
}

export interface SyncTranslateXParams {
  currentTime: number;
  durationMs: number;
  maxTranslateX: number;
  minTranslateX: number;
  translateX: SharedValue<number>;
}

export interface DrawDottedLineParams {
  canvasWidth: number;
  canvasHeight: number;
}

export interface CandleData extends DataPoint {
  visible: boolean;
}

export interface AudioVisualizerState {
  activePoints: CandleData[];
  range: {
    start: number;
    end: number;
    startVisibleIndex: number;
    endVisibleIndex: number;
  };
  ready: boolean;
  triggerUpdate: number;
  canvasWidth: number;
  currentTime?: number;
  hasInitialized: boolean;
  selectedCandle: CandleData | null;
}

export interface UpdateActivePointsParams {
  x: number;
  context: {
    dataPoints: DataPoint[];
    activePoints: CandleData[];
    maxDisplayedItems: number;
    referenceLineX: number;
    mode: "static" | "live";
    range: {
      start: number;
      end: number;
      startVisibleIndex: number;
      endVisibleIndex: number;
    };
    candleWidth: number;
    candleSpace: number;
    ready: boolean;
  };
  dispatch: React.Dispatch<AudioVisualiserAction>;
}

export interface UpdateActivePointsResult {
  activePoints: CandleData[];
  range: {
    start: number;
    end: number;
    startVisibleIndex: number;
    endVisibleIndex: number;
  };
}

export interface DebouncedUpdateActivePointsParams
  extends UpdateActivePointsParams {
  debounceTimer: NodeJS.Timeout | null;
}

export interface AudioVisualizerProps {
  audioData: AudioAnalysisData;
  currentTime?: number;
  canvasHeight?: number;
  candleWidth?: number;
  candleSpace?: number;
  showDottedLine?: boolean;
  showRuler?: boolean;
  mode?: "static" | "live";
  playing?: boolean;
  onSeekEnd?: (newTime: number) => void;
}

export interface CanvasContainerProps {
  currentTime?: number;
  canvasHeight: number;
  candleWidth: number;
  candleSpace: number;
  showDottedLine: boolean;
  showRuler: boolean;
  mode: "static" | "live" | "scaled";
  playing: boolean;
  onSeekEnd?: (newTime: number) => void;
  dispatch: React.Dispatch<AudioVisualiserAction>;
  translateX: SharedValue<number>;
  activePoints: CandleData[];
  lastUpdatedTranslateX: number;
  maxDisplayedItems: number;
  maxTranslateX: number;
  paddingLeft: number;
  totalCandleWidth: number;
  startIndex: number;
  canvasWidth: number;
  selectedCandle: DataPoint | null;
  durationMs?: number;
  minAmplitude: number;
  maxAmplitude: number;
  containerStyle?: StyleProp<ViewStyle>;
}
