import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View, Text } from "react-native";

const getStyles = () => {
  return StyleSheet.create({
    container: {},
  });
};

export interface SvgAudioCanvasProps {
  label: string;
}
export const SvgAudioCanvas = ({ label }: SvgAudioCanvasProps) => {
  const styles = useMemo(() => getStyles(), []);

  return (
    <View style={styles.container}>
      <Text>{label}</Text>
    </View>
  );
};
