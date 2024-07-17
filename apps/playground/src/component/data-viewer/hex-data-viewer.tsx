import { useTheme } from "@siteed/design-system";
import React, { useState } from "react";
import { StyleSheet, Text, View, Switch, TouchableOpacity } from "react-native";
import { SegmentedButtons } from "react-native-paper";

interface HexDataViewerProps {
  byteArray: Uint8Array;
}

type ViewMode = "hex" | "base64" | "string";

const PREVIEW_LENGTH = 300;

const bytesToHex = (bytes: Uint8Array) => {
  return bytes.reduce(
    (str, byte) => str + byte.toString(16).padStart(2, "0") + " ",
    "",
  );
};

const bytesToBase64 = (bytes: Uint8Array) => {
  const binary = String.fromCharCode.apply(null, bytes as any);
  return btoa(binary);
};

const bytesToString = (bytes: Uint8Array) => {
  return String.fromCharCode.apply(null, bytes as any);
};

export const HexDataViewer = ({ byteArray }: HexDataViewerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("hex");
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();

  const handleValueChange = (value: string) => {
    setViewMode(value as ViewMode);
  };

  let displayedData = "";
  if (viewMode === "hex") {
    displayedData = bytesToHex(byteArray);
  } else if (viewMode === "base64") {
    displayedData = bytesToBase64(byteArray);
  } else if (viewMode === "string") {
    displayedData = bytesToString(byteArray);
  }

  const previewData = displayedData.slice(0, PREVIEW_LENGTH);
  const isExpandable = displayedData.length > PREVIEW_LENGTH;

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={viewMode}
        onValueChange={handleValueChange}
        buttons={[
          {
            value: "hex",
            label: "Hex",
          },
          {
            value: "base64",
            label: "Base64",
          },
          {
            value: "string",
            label: "String",
          },
        ]}
        style={styles.segmentedButton}
      />
      <Text style={[styles.data, { color: theme.colors.text }]}>
        {expanded ? displayedData : previewData}
        {isExpandable && !expanded && (
          <TouchableOpacity onPress={() => setExpanded(true)}>
            <Text style={[styles.expandText, { color: theme.colors.primary }]}>
              {" "}
              Expand
            </Text>
          </TouchableOpacity>
        )}
      </Text>
      {expanded && (
        <TouchableOpacity onPress={() => setExpanded(false)}>
          <Text style={[styles.expandText, { color: theme.colors.primary }]}>
            {" "}
            Show Less
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  segmentedButton: {
    marginBottom: 10,
  },
  data: {
    marginTop: 10,
    fontSize: 14,
  },
  expandText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
