// playground/src/app/(tabs)/minimal.tsx
import {
  Canvas,
  Group,
  Rect,
  SkFont,
  useFont,
} from "@shopify/react-native-skia";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
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

const getStyles = (screenWidth: number, canvasWidth: number) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    canvasContainer: {
      width: canvasWidth,
      backgroundColor: "#292a2d",
      justifyContent: "center",
      alignItems: "center",
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

const WaveFormRect = React.memo(
  ({
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
  },
);
WaveFormRect.displayName = "WaveFormRect";

const Minimal = () => {
  const { width: screenWidth } = useWindowDimensions();
  const [canvasWidth, setCanvasWidth] = useState(0);

  const styles = React.useMemo(
    () => getStyles(screenWidth, canvasWidth),
    [screenWidth, canvasWidth],
  );
  const translateX = useSharedValue(0);
  const [wavepoints, setWavepoints] = useState(generateWaveform(20000)); // Generate random waveform values
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"static" | "live">("static"); // live is always making the waveform on the right

  const maxDisplayedItems = Math.ceil(
    screenWidth / (RECT_WIDTH + SPACE_BETWEEN_RECTS),
  );
  const font = useFont(require("@assets/Roboto/Roboto-Regular.ttf"), FONT_SIZE);
  const [activePoints, setActivePoints] = useState<
    { amplitude: number; id: number; visible: boolean; animated?: boolean }[]
  >([]);
  const [counter, setCounter] = useState(0);

  const maxTranslateX =
    wavepoints.length * (RECT_WIDTH + SPACE_BETWEEN_RECTS) + canvasWidth;
  const [startIndex, setStartIndex] = useState(0);
  const prevLength = useRef<number>(wavepoints.length);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    console.log(`Layout width: ${width}`);
    setCanvasWidth(width);
  }, []);

  const updateActivePoints = (x: number) => {
    const currentLength = wavepoints.length;

    if (mode === "live") {
      const totalItems = wavepoints.length;
      const newItemsCount = currentLength - prevLength.current;

      const liveMaxDisplayedItems = Math.floor(maxDisplayedItems / 2);
      const startIndex = Math.max(0, totalItems - liveMaxDisplayedItems);
      console.log(
        `\nupdateActivePoints (live) startIndex=${startIndex}, totalItems=${totalItems}, maxDisplayedItems=${maxDisplayedItems}`,
      );

      const updatedPoints = [];
      for (let i = 0; i < liveMaxDisplayedItems; i++) {
        const itemIndex = startIndex + i;
        if (itemIndex < totalItems) {
          updatedPoints.push({
            id: itemIndex,
            amplitude: wavepoints[itemIndex],
            visible: true,
            animated: itemIndex >= totalItems - newItemsCount, // Animate new items
          });
        }
      }

      console.log(`Updated points (live):`, updatedPoints);
      setActivePoints(updatedPoints);
      setStartIndex(0);
    } else if (mode === "static") {
      const translateX = Math.abs(x);
      console.log(`x: ${x} translateX: ${translateX}`);

      const hiddenItemsLeft = Math.floor(
        translateX / (RECT_WIDTH + SPACE_BETWEEN_RECTS),
      );

      let itemsOffset = Math.floor(maxDisplayedItems / 2);
      if (hiddenItemsLeft <= itemsOffset) {
        // Ignore up to half of maxDisplayedItems / 2 items on the left
        itemsOffset = hiddenItemsLeft;
      }

      const startIndex = Math.max(
        0,
        hiddenItemsLeft - maxDisplayedItems - itemsOffset,
      );
      console.log(
        `hiddenItemsLeft: ${hiddenItemsLeft}  maxDisplayedItems=${maxDisplayedItems}`,
      );
      console.log(`itemsOffset: ${itemsOffset} startIndex: ${startIndex}`);

      // We directly update the activePoints array to avoid "flickering" when updating the state
      const loopTo = maxDisplayedItems * 3;
      for (let i = 0; i < loopTo; i++) {
        const itemIndex = startIndex + i;
        if (itemIndex < wavepoints.length) {
          const limitLeft = hiddenItemsLeft - itemsOffset;
          const limitRight = hiddenItemsLeft + maxDisplayedItems - itemsOffset;
          const visible = itemIndex >= limitLeft && itemIndex <= limitRight;
          // console.log(
          //   `itemIndex: ${itemIndex} visible: ${visible} limitLeft: ${limitLeft} limitRight: ${limitRight}`,
          // );
          activePoints[i] = {
            id: itemIndex,
            amplitude: wavepoints[itemIndex],
            visible,
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
    }
    // Force trigger re-rendering wiht counter otherwise it may not refresh when scrolling back to initial positions
    setCounter((prev) => prev + 1);
    // Update previous length
    prevLength.current = currentLength;

    // Logging for debugging
    console.log(
      `updateActivePoints x: ${x} StartIndex: ${startIndex}`,
      // activePoints,
    );
  };

  useEffect(() => {
    const initialTranslateX = Math.max(-maxTranslateX + screenWidth, 0);
    translateX.value = initialTranslateX;
    updateActivePoints(initialTranslateX);
  }, []);

  useEffect(() => {
    if (mode === "live") {
      const initialTranslateX = Math.max(-maxTranslateX + screenWidth, 0);
      translateX.value = initialTranslateX;
      updateActivePoints(initialTranslateX);
    }
  }, [mode, wavepoints]);

  const panGesture = Gesture.Pan()
    .onChange((event) => {
      if (mode === "live") return; // Disable pan gesture in live mode

      const newTranslateX = translateX.value + event.changeX;
      // console.log(`onChange: translateX: ${translateX.value} `, event);
      const clampedTranslateX = Math.max(
        -maxTranslateX + screenWidth,
        Math.min(0, newTranslateX),
      ); // Clamping within bounds
      translateX.value = clampedTranslateX;
    })
    .onEnd((event) => {
      if (mode === "live") return; // Disable pan gesture on end in live mode

      // Adjust the activePoints based on the translateX value
      console.log(`onEnd: translateX: ${translateX.value} `, event);
      runOnJS(updateActivePoints)(translateX.value);
    });

  const transform = useDerivedValue(() => {
    return [{ translateX: translateX.value }];
  });

  const addWavePoints = () => {
    setWavepoints([...wavepoints, ...generateWaveform(1)]);
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
    <View style={styles.container} onLayout={handleLayout}>
      <View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Button
            onPress={() => {
              setMode(mode === "live" ? "static" : "live");
            }}
          >
            Toggle Mode (Current: {mode})
          </Button>
          {mode === "live" ? (
            <>
              <Button onPress={addWavePoints}>Add Wavepoints</Button>
            </>
          ) : (
            <>
              <Button
                onPress={() => {
                  translateX.value = 0;
                  updateActivePoints(0);
                }}
              >
                reset
              </Button>
            </>
          )}
        </View>
        <View>
          <Text>translareX: {translateX.value}</Text>
          <Text>Points: {wavepoints.length}</Text>
          <Text>activePoints: {activePoints.length}</Text>
          <Text>canvasWidth: {canvasWidth}</Text>
          <Text>MaxDisplayedItems: {maxDisplayedItems}</Text>
          <Text>StartIndex: {startIndex}</Text>
        </View>
        <GestureDetector gesture={panGesture}>
          <View style={styles.canvasContainer}>
            <Canvas
              style={{
                height: CANVAS_HEIGHT,
                width: screenWidth,
                borderWidth: 1,
              }}
            >
              <Group transform={transform}>
                {activePoints.map(
                  ({ id, amplitude, visible, animated }, index) => {
                    if (amplitude === 0 && id === -1) return null;
                    const scaledAmplitude = amplitude * CANVAS_HEIGHT;

                    let delta =
                      Math.ceil(maxDisplayedItems / 2) *
                      (RECT_WIDTH + SPACE_BETWEEN_RECTS);
                    if (mode === "live") {
                      delta = 0;
                    }

                    const x =
                      (RECT_WIDTH + SPACE_BETWEEN_RECTS) * index +
                      startIndex * (RECT_WIDTH + SPACE_BETWEEN_RECTS) +
                      delta;
                    return (
                      <WaveFormRect
                        key={`r_${index}_${id}`}
                        animated={animated}
                        x={x}
                        y={CANVAS_HEIGHT / 2 - scaledAmplitude / 2}
                        width={RECT_WIDTH}
                        font={font}
                        id={id}
                        height={scaledAmplitude}
                        color={visible ? "rgba(74, 144, 226, 1)" : "grey"}
                      />
                    );
                  },
                )}
              </Group>
            </Canvas>
            <View
              style={[
                {
                  position: "absolute",
                  top: CANVAS_HEIGHT / 6,
                  left: screenWidth / 2,
                  width: 2,
                  height: CANVAS_HEIGHT / 1.5,
                  backgroundColor: "red",
                },
              ]}
            />
          </View>
        </GestureDetector>
      </View>
    </View>
  );
};

export default Minimal;
