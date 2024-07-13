import { FontAwesome } from "@expo/vector-icons";
import { ItemView } from "@siteed/design-system";
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
}
export const DataPointViewer = ({ dataPoint }: DataPointViewerProps) => {
  const styles = useMemo(() => getStyles(), []);

  return (
    <View style={styles.container}>
      <View style={styles.mainInfoContainer}>
        <View style={styles.attributeContainer}>
          <Text style={styles.label}>db</Text>
          <Text style={styles.value}>{dataPoint.dB?.toFixed(2)}</Text>
        </View>
        <View style={styles.attributeContainer}>
          <Text style={styles.label}>Timestamp:</Text>
          <Text style={styles.value}>{dataPoint.timestamp?.toFixed(2)}</Text>
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
      <ItemView
        label="Features"
        value={JSON.stringify(dataPoint.features)}
        containerStyle={{ margin: 0 }}
      />
    </View>
  );
};
