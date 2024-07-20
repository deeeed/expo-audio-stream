export interface WaveformProps {
    buffer: ArrayBuffer
    bitDepth?: number
    sampleRate?: number
    channels?: number
    visualizationType?: 'line' | 'candlestick'
    currentTime?: number // Current playback time in seconds
    pointsPerSecond?: number // Default points per second
    candleStickWidth?: number
    waveformHeight?: number
    candleStickSpacing?: number
    showRuler?: boolean
    candleColor?: string
    mode?: 'static' | 'live' | 'preview'
    debug?: boolean
}

export interface Point {
    x: number
    y: number
}
export interface Bar extends Point {
    height: number
}
