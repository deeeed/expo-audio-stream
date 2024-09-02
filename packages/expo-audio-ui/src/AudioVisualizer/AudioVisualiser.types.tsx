// playground/src/component/audio-visualizer/autio-visualizer.types.ts
import { DataPoint } from '@siteed/expo-audio-stream'
import { StyleProp, TextStyle, ViewStyle } from 'react-native'
import { SharedValue } from 'react-native-reanimated'

export interface AudioVisualizerTheme {
    container: StyleProp<ViewStyle>
    navigationContainer: StyleProp<ViewStyle>
    canvasContainer: StyleProp<ViewStyle>
    referenceLine: StyleProp<ViewStyle>
    text: StyleProp<TextStyle>
    button: StyleProp<ViewStyle>
    buttonText: StyleProp<TextStyle>
}

export interface CalculateReferenceLinePositionParams {
    canvasWidth: number
    referenceLinePosition: 'MIDDLE' | 'RIGHT'
}

export interface GetStylesParams {
    canvasWidth: number
    referenceLineX: number
}

export interface SyncTranslateXParams {
    currentTime: number
    durationMs: number
    maxTranslateX: number
    minTranslateX: number
    translateX: SharedValue<number>
}

export interface DrawDottedLineParams {
    canvasWidth: number
    canvasHeight: number
}

export interface CandleData extends DataPoint {
    visible: boolean
}

export interface AudioVisualizerState {
    ready: boolean
    triggerUpdate: number
    canvasWidth: number
    currentTime?: number
    hasInitialized: boolean
    selectedCandle: CandleData | null
    selectedIndex: number
}

export interface UpdateActivePointsParams {
    x: number
    context: {
        dataPoints: DataPoint[]
        activePoints: CandleData[]
        maxDisplayedItems: number
        referenceLineX: number
        mode: 'static' | 'live'
        range: {
            start: number
            end: number
            startVisibleIndex: number
            endVisibleIndex: number
        }
        candleWidth: number
        candleSpace: number
    }
}

export interface UpdateActivePointsResult {
    activePoints: CandleData[]
    range: {
        start: number
        end: number
        startVisibleIndex: number
        endVisibleIndex: number
    }
    lastUpdatedTranslateX: number
}
