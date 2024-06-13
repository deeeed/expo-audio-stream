import {
  Canvas,
  Group,
  Rect,
  SkFont,
  Text as SkText,
  useFont,
} from "@shopify/react-native-skia";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Text,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Button } from "react-native-paper";
import {
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import AnimatedCandle from "../../component/audio-visualizer/animated-candle";

const getStyles = (screenWidth: number, canvasWidth: number) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    scrollView: {
      width: "100%",
    },
    canvasContainer: {
      width: canvasWidth,
      height: 300,
      // backgroundColor: "#292a2d",
      justifyContent: "center",
      alignItems: "center",
      borderColor: "green",
      gap: 5,
      borderWidth: 1,
    },
    centeredLine: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: screenWidth / 2,
      width: 2,
      backgroundColor: "red",
    },
  });
};

const generateWaveform = (length: number) => {
  return Array.from({ length }, () => Math.random());
};

const RECT_WIDTH = 5;
const SPACE_BETWEEN_RECTS = 2;
const CANVAS_HEIGHT = 300;
const FONT_SIZE = 20;

const WaveFormRect = ({
  x: targetX,
  y: targetY,
  id,
  width,
  font,
  height: targetHeight,
  color,
  animated,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  id: number;
  color: string;
  animated?: boolean;
  font: SkFont;
}) => {
  const y = useSharedValue(targetY / 2);
  const height = useSharedValue(0);
  const x = useSharedValue(targetX);

  useEffect(() => {
    if (!animated) {
      return;
    }
    y.value = withTiming(targetY, { duration: 500 });
    height.value = withTiming(targetHeight, { duration: 500 });
    x.value = withTiming(targetX, { duration: 500 });
  });
  return (
    <>
      <Rect
        width={width}
        x={animated ? x : targetX}
        y={animated ? y : targetY}
        height={animated ? height : targetHeight}
        color={color}
      />
    </>
  );
};

const Minimal = () => {
  const { width: screenWidth } = useWindowDimensions();
  const canvasWidth = screenWidth; // Canvas width is twice the screen width
  const styles = React.useMemo(
    () => getStyles(screenWidth, canvasWidth),
    [screenWidth, canvasWidth],
  );
  const translateX = useSharedValue(0);
  const [wavepoints, setWavepoints] = useState(generateWaveform(20000)); // Generate random waveform values
  const [loading, setLoading] = useState(true);

  const maxDisplayedItems = Math.ceil(
    screenWidth / (RECT_WIDTH + SPACE_BETWEEN_RECTS),
  );
  const font = useFont(
    require("../../../assets/Roboto/Roboto-Regular.ttf"),
    FONT_SIZE,
  );
  const [activePoints, setActivePoints] = useState<
    { amplitude: number; id: number; visible: boolean }[]
  >(
    new Array(maxDisplayedItems * 3).fill({
      amplitude: 0,
      id: -1,
      visible: false,
    }),
  );

  const maxTranslateX = wavepoints.length * (RECT_WIDTH + SPACE_BETWEEN_RECTS);
  const [startIndex, setStartIndex] = useState(0);

  const updateActivePoints = (x: number) => {
    const translateX = Math.abs(x);
    const hiddenItemsLeft = Math.floor(
      translateX / (RECT_WIDTH + SPACE_BETWEEN_RECTS),
    );
    const startIndex = Math.max(0, hiddenItemsLeft - maxDisplayedItems);
    const endIndex = Math.min(
      wavepoints.length,
      startIndex + maxDisplayedItems * 3,
    );

    for (let i = 0; i < activePoints.length; i++) {
      const itemIndex = startIndex + i;
      if (itemIndex < wavepoints.length) {
        activePoints[i] = {
          id: itemIndex,
          amplitude: wavepoints[itemIndex],
          visible:
            itemIndex >= hiddenItemsLeft &&
            itemIndex < hiddenItemsLeft + maxDisplayedItems,
        };
      } else {
        activePoints[i] = {
          id: -1,
          amplitude: 0,
          visible: false,
        };
      }
    }

    setActivePoints(activePoints);
    setStartIndex(startIndex);

    // Logging for debugging
    console.log(
      `StartIndex: ${startIndex}, EndIndex: ${endIndex}`,
      activePoints,
    );
  };

  useEffect(() => {
    updateActivePoints(0);
  }, []);

  const panGesture = Gesture.Pan()
    .onChange((event) => {
      const newTranslateX = translateX.value + event.changeX;
      const clampedTranslateX = Math.max(
        -maxTranslateX + screenWidth,
        Math.min(0, newTranslateX),
      ); // Clamping within bounds
      translateX.value = clampedTranslateX;
    })
    .onEnd((event) => {
      // Adjust the activePoints based on the translateX value
      console.log(`onEnd: translateX: ${translateX.value} `, event);
      runOnJS(updateActivePoints)(translateX.value);
    });

  const transform = useDerivedValue(() => {
    return [{ translateX: translateX.value }];
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setWavepoints([]); // Clear the wavepoints state
      const response = await fetch("/googlewaveform.json");
      const data = await response.json();
      setWavepoints(data[0]); // Update the wavepoints state with the fetched data
      // count non zera wavepoints
      const count = data[0].filter(
        (amplitude: number) => amplitude !== 0,
      ).length;
      console.log(`non zero wavepoints: ${count} vs ${data[0].length}`);
    } catch (error) {
      console.error("Error fetching waveform data:", error);
    } finally {
      setLoading(false);
    }
  };

  const addWavePoints = () => {
    setWavepoints([...wavepoints, ...generateWaveform(10)]);
  };

  const { min, max } = useMemo(() => {
    // extract min and max from wavepoint in a single pass
    let min = Infinity;
    let max = -Infinity;
    wavepoints.forEach((amplitude) => {
      if (amplitude < min) {
        min = amplitude;
      }
      if (amplitude > max) {
        max = amplitude;
      }
    });
    return { min, max };
  }, [wavepoints]);

  if (!font) {
    return null;
  }

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.canvasContainer}>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <Button
              onPress={() => {
                translateX.value = 0;
                updateActivePoints(0);
              }}
            >
              reset
            </Button>
            <Button onPress={addWavePoints}>Add Wavepoints</Button>
            {Platform.OS === "web" && (
              <Button onPress={loadData}>Load Remote Data</Button>
            )}
          </View>
          <Text>translareX: {translateX.value}</Text>
          <Text>Points: {wavepoints.length}</Text>
          <Text>activePoints: {activePoints.length}</Text>
          <Text>MaxDisplayedItems: {maxDisplayedItems}</Text>
          <Text>StartIndex: {startIndex}</Text>
          <Text>
            range: {min} , {max}
          </Text>
          <Canvas
            style={{
              height: CANVAS_HEIGHT,
              width: screenWidth,
              borderWidth: 1,
            }}
          >
            <Group transform={transform}>
              {activePoints.map(({ id, amplitude, visible }, index) => {
                if (amplitude === 0 && id === -1) return null;
                const scaledAmplitude = (amplitude * CANVAS_HEIGHT) / max;
                return (
                  <WaveFormRect
                    key={"r" + id}
                    animated={false}
                    x={
                      (RECT_WIDTH + SPACE_BETWEEN_RECTS) * index +
                      startIndex * (RECT_WIDTH + SPACE_BETWEEN_RECTS)
                    }
                    y={CANVAS_HEIGHT / 2 - scaledAmplitude / 2}
                    width={RECT_WIDTH}
                    font={font}
                    id={id}
                    height={scaledAmplitude}
                    color="cyan"
                  />
                );
              })}
            </Group>
          </Canvas>
        </View>
      </GestureDetector>
    </View>
  );
};

export default Minimal;
