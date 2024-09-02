// playground/src/component/audio-visualizer/autio-visualizer.types.ts
import { DataPoint } from '@siteed/expo-audio-stream'
import { TextStyle, ViewStyle } from 'react-native'
import { SharedValue } from 'react-native-reanimated'

export interface AudioVisualizerTheme {
    container: ViewStyle
    navigationContainer: ViewStyle
    canvasContainer: ViewStyle
    referenceLine: ViewStyle
    text: TextStyle
    button: ViewStyle
    buttonText: TextStyle
    dottedLineColor: string
    yAxis: {
        tickColor: string
        labelColor: string
    }
    timeRuler: {
        tickColor: string
        labelColor: string
    }
    candle: {
        activeAudioColor?: string
        activeSpeechColor?: string
        offcanvasColor?: string
        selectedColor?: string
    }
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
