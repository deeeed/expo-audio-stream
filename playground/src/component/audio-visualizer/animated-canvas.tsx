import { Canvas } from "@shopify/react-native-skia";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

import { AnimatedCircle } from "./animated-circle";

export type Item = {
  x: number;
  y: number;
  color: string;
};

type Props = {
  items: Item[];
};

const AnimatedCanvas: React.FC<Props> = ({ items: argItems }) => {
  const [circles, setCircles] = useState<Item[]>(argItems);
  //   const [items, setItems] = useState(argItems);

  useEffect(() => {
    // Ensure we update the circles state when items change
    // setCircles(items);
    setCircles(argItems);
  }, [argItems]);

  return (
    <View style={{ flex: 1 }}>
      <Text>Len Aeg: {argItems.length}</Text>
      <Text>State Aeg: {circles.length}</Text>
      <Canvas style={{ flex: 1 }}>
        {circles.map((circle, index) => (
          <AnimatedCircle
            key={index}
            cx={circle.x}
            cy={circle.y}
            r={20}
            color={circle.color}
          />
        ))}
      </Canvas>
    </View>
  );
};

export default AnimatedCanvas;
