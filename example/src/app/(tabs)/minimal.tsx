import { Canvas, Group, Rect } from "@shopify/react-native-skia";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Button } from "react-native-paper";
import {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";

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
      borderColor: "green",
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
const SPACE_BETWEEN_RECTS = 5;
const CANVAS_HEIGHT = 300;
const Minimal = () => {
  const { width: screenWidth } = useWindowDimensions();
  const canvasWidth = screenWidth; // Canvas width is twice the screen width
  const styles = React.useMemo(
    () => getStyles(screenWidth, canvasWidth),
    [screenWidth, canvasWidth],
  );
  const translateX = useSharedValue(0);
  const [wavepoints, setWavepoints] = useState(generateWaveform(30000)); // Generate random waveform values

  const panGesture = Gesture.Pan().onChange((event) => {
    translateX.value += event.changeX;
    console.log(`translateX: ${translateX.value}`);
  });

  const transform = useDerivedValue(() => {
    return [{ translateX: translateX.value }];
  });

  const loadData = async () => {
    try {
      const response = await fetch("/googlewaveform.json");
      const data = await response.json();
      setWavepoints(data[0]); // Update the wavepoints state with the fetched data
    } catch (error) {
      console.error("Error fetching waveform data:", error);
    }
  };

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.canvasContainer}>
          <Button
            onPress={() => {
              translateX.value = 0;
            }}
          >
            reset
          </Button>
          {Platform.OS === "web" && (
            <Button onPress={loadData}>Load Remote Data</Button>
          )}
          <Text>translareX: {translateX.value}</Text>
          <Text>Points: {wavepoints.length}</Text>
          <Canvas style={{ height: 300, width: screenWidth, borderWidth: 1 }}>
            <Group transform={transform}>
              {wavepoints.map((amplitude, index) => {
                const height = amplitude * CANVAS_HEIGHT; // Scale the height based on amplitude
                const y = CANVAS_HEIGHT / 2 - height / 2; // Center the rectangle vertically

                // skip 0 amplitude
                if (height === 0) {
                  return null;
                }
                return (
                  <Rect
                    key={"r" + index}
                    x={(RECT_WIDTH + SPACE_BETWEEN_RECTS) * index}
                    y={y}
                    width={RECT_WIDTH}
                    height={height}
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
