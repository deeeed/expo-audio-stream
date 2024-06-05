import { useEffect, useState } from "react";
import { Bar, Point } from "../component/waveform/waveform.types";

export const calculateMinMax = (data: Float32Array, start: number, end: number) => {
    let min = Infinity;
    let max = -Infinity;
    for (let i = start; i < end; i++) {
        if (data[i] < min) min = data[i];
        if (data[i] > max) max = data[i];
    }
    return { min, max };
};


export const calculateMinMaxAverage = (data: Float32Array, start: number, end: number) => {
    const { min, max } = calculateMinMax(data, start, end);
    const average = (min + max) / 2;
    return { min, max, average };
};

interface GenerateBarsParams {
    data: Float32Array;
    pointsPerSecond: number;
    waveformHeight: number;
    totalWidth: number;
    sampleRate: number;
    channels: number;
    duration: number;
    candleStickWidth: number;
    candleStickSpacing: number;
}

export const generateBars = ({
    data,
    pointsPerSecond,
    waveformHeight,
    sampleRate,
    channels,
    duration,
    candleStickWidth,
    candleStickSpacing,
}: GenerateBarsParams) => {
    const samplesPerPoint = sampleRate / pointsPerSecond;
    const bars: Bar[] = [];
    const totalPoints = Math.ceil(duration * pointsPerSecond);

    console.log(`Total points: ${totalPoints}, samplesPerPoint: ${samplesPerPoint}, data.length: ${data.length}`);

    for (let i = 0; i < totalPoints; i++) {
        const start = Math.floor(i * samplesPerPoint);
        const end = Math.min(Math.floor(start + samplesPerPoint), data.length);
        const { min, max } = calculateMinMax(data, start, end);
        const normalizedMin = (min + 1) / 2;
        const normalizedMax = (max + 1) / 2;

        bars.push({
            x: i * (candleStickWidth + candleStickSpacing),
            y: (1 - normalizedMax) * waveformHeight,
            height: Math.max(1, (normalizedMax - normalizedMin) * waveformHeight),
        });
    }
    return bars;
};


interface GenerateLinePointsParams {
    data: Float32Array;
    pointsPerSecond: number;
    waveformHeight: number;
    totalWidth: number;
    sampleRate: number;
    channels: number;
    duration: number;
}

export const generateLinePoints = ({
    data,
    pointsPerSecond,
    waveformHeight,
    totalWidth,
    sampleRate,
    channels,
    duration,
}: GenerateLinePointsParams) => {
    const samplesPerPoint = sampleRate / pointsPerSecond;
    const points: Point[] = [];
    const totalPoints = Math.ceil(duration * pointsPerSecond);

    console.log(`Total points: ${totalPoints}, samplesPerPoint: ${samplesPerPoint}, data.length: ${data.length}`);

    for (let i = 0; i < totalPoints; i++) {
        const start = Math.floor(i * samplesPerPoint);
        const end = Math.min(Math.floor(start + samplesPerPoint), data.length);
        if (start >= data.length || end > data.length) {
            console.error(`Invalid range: start=${start}, end=${end}, data.length=${data.length}`);
            continue;
        }
        const { average } = calculateMinMaxAverage(data, start, end);
        const normalizedAverage = (average + 1) / 2;

        if (isNaN(normalizedAverage)) {
            console.error(`NaN detected: start=${start}, end=${end}, average=${average}, normalizedAverage=${normalizedAverage}`);
        }

        points.push({
            x: i * (totalWidth / totalPoints), // Distribute points evenly across the total width
            y: (1 - normalizedAverage) * waveformHeight,
        });
    }
    return points;
};




interface WaveformVisualizationParams {
    data: Float32Array; // Full audio WaveForm
    pointsPerSecond: number;
    waveformHeight: number;
    candleStickWidth: number;
    candleStickSpacing: number;
    totalWidth: number;
    duration: number;
    visualizationType: string;
    mode: string;
    sampleRate: number;
    channels?: number; // Optional, default to mono
}

export const useWaveformVisualization = ({
    data,
    pointsPerSecond,
    waveformHeight,
    totalWidth,
    visualizationType,
    candleStickSpacing,
    candleStickWidth,
    mode,
    duration,
    sampleRate,
    channels = 1,
}: WaveformVisualizationParams): { bars?: Bar[]; points?: Point[] } => {
    const [bars, setBars] = useState<Bar[] | undefined>(undefined);
    const [points, setPoints] = useState<Point[] | undefined>(undefined);

    useEffect(() => {
        if (visualizationType === "candlestick") {
            const generatedBars = generateBars({
                data,
                pointsPerSecond,
                waveformHeight,
                totalWidth,
                sampleRate,
                channels,
                duration,
                candleStickWidth,
                candleStickSpacing,
            });
            console.log(`Generated ${generatedBars.length} bars`)
            setBars(generatedBars);
        } else if (visualizationType === "line") {
            const generatedPoints = generateLinePoints({
                data,
                pointsPerSecond,
                waveformHeight,
                totalWidth,
                sampleRate,
                channels,
                duration,
            });
            console.log(`Generated ${generatedPoints.length} line points`, generatedPoints?.slice(-10))
            setPoints(generatedPoints);
        }
        const { min, max } = calculateMinMax(data, 0, data.length);
        console.log(`data.length: ${data.length} min=${min} max=${max}`);
    }, [data, pointsPerSecond, waveformHeight, totalWidth, visualizationType, mode, sampleRate, channels]);


    return { bars, points };
};
