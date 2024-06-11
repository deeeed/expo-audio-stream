import {
  Canvas,
  Circle,
  Group,
  Path,
  Rect,
  RoundedRect,
  Skia,
  SkPath,
} from "@shopify/react-native-skia";
import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
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
      backgroundColor: "#292a2d",
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

const Minimal = () => {
  const { width: screenWidth } = useWindowDimensions();
  const canvasWidth = screenWidth; // Canvas width is twice the screen width
  const styles = React.useMemo(
    () => getStyles(screenWidth, canvasWidth),
    [screenWidth, canvasWidth],
  );
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan().onUpdate((event) => {
    translateX.value += event.translationX;
    console.log(`translateX: ${translateX.value}`);
  });

  const [activeRect, setActiveRect] = useState<
    { amplitude: number; x: number }[]
  >(
    Array.from({ length: 100 }).map((_, index) => ({
      amplitude: 0.3,
      x: 130 * (index + 1),
    })),
  );

  const tx = useDerivedValue(() => {
    return translateX.value;
  });

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.canvasContainer}>
          <Canvas style={{ height: 300 }}>
            {activeRect.map((rect, index) => {
              return (
                <Rect
                  key={"r" + index}
                  x={rect.x}
                  y={64}
                  //   transform={[{ translateX: tx.value }]}
                  width={128}
                  height={128}
                />
              );
            })}
          </Canvas>
        </View>
      </GestureDetector>
    </View>
  );
};

export default Minimal;
