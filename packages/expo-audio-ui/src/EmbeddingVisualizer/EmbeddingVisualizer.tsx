import React, { useEffect, useState } from 'react';
import { Canvas, Rect, Group } from '@shopify/react-native-skia';
import { ViewStyle } from 'react-native';

interface CellData {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface EmbeddingVisualizerProps {
  embeddings: number[] | number[][];
  width: number;
  height: number;
  style?: ViewStyle;
}

const interpolateColor = (value: number): string => {
  const r = Math.round(255 * (1 - value));
  const g = Math.round(255 * value);
  const b = Math.round(255 * Math.abs(0.5 - value) * 2);
  return `rgb(${r}, ${g}, ${b})`;
};

export const EmbeddingVisualizer: React.FC<EmbeddingVisualizerProps> = ({
  embeddings,
  width,
  height,
  style,
}) => {
  const [visualizationData, setVisualizationData] = useState<CellData[]>([]);

  useEffect(() => {
    if (!embeddings || embeddings.length === 0) {
      setVisualizationData([]);
      return;
    }

    // Normalize embeddings to an array of arrays
    const normalizedEmbeddings: number[][] = Array.isArray(embeddings[0])
      ? (embeddings as number[][])
      : [embeddings as number[]];

    const totalEmbeddings = normalizedEmbeddings.length;
    const embeddingLength = normalizedEmbeddings[0]?.length || 0;

    // Calculate the number of cells per row based on the embedding length
    const cellsPerRow = Math.ceil(Math.sqrt(embeddingLength));
    const cellWidth = width / cellsPerRow;
    const cellsPerColumn = Math.ceil(embeddingLength / cellsPerRow);
    const cellHeight = height / (totalEmbeddings * cellsPerColumn);

    const computedData: CellData[] = normalizedEmbeddings.flatMap(
      (embedding, embeddingIndex) => {
        const minValue = Math.min(...embedding);
        const maxValue = Math.max(...embedding);
        const range = maxValue - minValue || 1; // Avoid division by zero

        return embedding.map((value, index) => {
          const normalizedValue = (value - minValue) / range;
          const color = interpolateColor(normalizedValue);
          const x = (index % cellsPerRow) * cellWidth;
          const y =
            (Math.floor(index / cellsPerRow) + embeddingIndex * cellsPerColumn) *
            cellHeight;

          return { x, y, width: cellWidth, height: cellHeight, color };
        });
      }
    );

    setVisualizationData(computedData);
  }, [embeddings, width, height]);

  return (
    <Canvas style={{ width, height, ...(style || {}) }}>
      <Group>
        {visualizationData.map((cell: CellData, index: number) => (
          <Rect
            key={index}
            x={cell.x}
            y={cell.y}
            width={cell.width}
            height={cell.height}
            color={cell.color}
          />
        ))}
      </Group>
    </Canvas>
  );
};
