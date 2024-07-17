import { FontAwesome } from "@expo/vector-icons";
import { EditableInfoCard } from "@siteed/design-system";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DataPoint } from "../../../../src";

const getStyles = () => {
  return StyleSheet.create({
    container: {
      marginTop: 10,
      padding: 5,
      gap: 10,
    },
    mainInfoContainer: {
      gap: 15,
      flexDirection: "row",
      flexWrap: "wrap",
    },
    attributeContainer: {
      flexDirection: "row",
      gap: 5,
    },
    label: { fontWeight: "bold" },
    value: {},
    icon: {},
  });
};

export interface DataPointViewerProps {
  dataPoint: DataPoint;
  index?: number;
}
export const DataPointViewer = ({ dataPoint }: DataPointViewerProps) => {
  const styles = useMemo(() => getStyles(), []);
  return (
    <View style={styles.container}>
      <View style={styles.mainInfoContainer}>
        <View style={styles.attributeContainer}>
          <Text style={styles.label}>Samples:</Text>
          <Text style={styles.value}>{dataPoint.samples}</Text>
        </View>
        <View style={styles.attributeContainer}>
          <Text style={styles.label}>Amplitude:</Text>
          <Text style={styles.value}>{dataPoint.amplitude.toFixed(2)}</Text>
        </View>
        <View style={styles.attributeContainer}>
          <Text style={styles.label}>db:</Text>
          <Text style={styles.value}>{dataPoint.dB?.toFixed(2)}</Text>
        </View>
        <View style={styles.attributeContainer}>
          <Text style={styles.label}>Segment:</Text>
          <Text style={styles.value}>
            {dataPoint.startTime?.toFixed(2)}-{dataPoint.endTime?.toFixed(2)}
          </Text>
        </View>
        <View style={styles.attributeContainer}>
          <Text style={styles.label}>Silent</Text>
          <FontAwesome
            name="check-circle"
            size={16}
            color={dataPoint.silent ? "green" : "grey"}
            style={styles.icon}
          />
        </View>
        <View style={styles.attributeContainer}>
          <Text style={styles.label}>Speech:</Text>
          <FontAwesome
            name="check-circle"
            size={16}
            color={dataPoint.activeSpeech ? "green" : "grey"}
            style={styles.icon}
          />
        </View>
      </View>
      <EditableInfoCard
        label="Features"
        value={JSON.stringify(dataPoint.features ?? {}, null, 2)}
        containerStyle={{ margin: 0 }}
      />
    </View>
  );
};
