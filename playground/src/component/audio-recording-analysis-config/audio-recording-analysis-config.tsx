import { Button, LabelSwitch, NumberAdjuster } from "@siteed/design-system";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AudioFeaturesOptions, RecordingConfig } from "../../../../src";

const getStyles = () => {
  return StyleSheet.create({
    container: {
      padding: 20,
    },
    actionContainer: {
      flexDirection: "row",
      marginTop: 20,
      gap: 20,
    },
    actionButton: {
      flex: 1,
    },
  });
};

export interface SelectedAnalysisConfig {
  pointsPerSecond: RecordingConfig["pointsPerSecond"];
  features: AudioFeaturesOptions;
}

export interface AudioRecordingAnalysisConfigProps {
  config: SelectedAnalysisConfig;
  onChange?: (config: SelectedAnalysisConfig) => void;
}

export const AudioRecordingAnalysisConfig = ({
  config,
  onChange,
}: AudioRecordingAnalysisConfigProps) => {
  const styles = useMemo(() => getStyles(), []);

  const [tempConfig, setTempConfig] = useState<SelectedAnalysisConfig>({
    ...config,
  });

  useEffect(() => {
    setTempConfig({ ...config });
  }, [config]);

  const handleChange = useCallback(
    (key: keyof SelectedAnalysisConfig, value: number | boolean) => {
      setTempConfig((prevConfig) => {
        const newConfig = { ...prevConfig, [key]: value };
        return newConfig;
      });
    },
    [onChange],
  );

  const handleFeatureChange = useCallback(
    (feature: keyof AudioFeaturesOptions, value: boolean) => {
      setTempConfig((prevConfig) => {
        const newConfig = {
          ...prevConfig,
          features: { ...prevConfig.features, [feature]: value },
        };
        return newConfig;
      });
    },
    [onChange],
  );

  const handleSave = useCallback(() => {
    onChange?.(tempConfig);
  }, [tempConfig, onChange]);

  const handleCancel = useCallback(() => {
    setTempConfig({ ...config });
    onChange?.(config);
  }, [config]);

  return (
    <View style={styles.container}>
      <NumberAdjuster
        label="Points Per Second"
        value={tempConfig.pointsPerSecond ?? 20}
        onChange={(value) => handleChange("pointsPerSecond", value)}
        min={0.1}
        max={100}
        step={1}
      />
      <LabelSwitch
        label="Energy"
        onValueChange={(value) => {
          handleFeatureChange("energy", value);
        }}
        value={tempConfig.features.energy ?? false}
      />
      <LabelSwitch
        label="Zero Crossing Rate"
        onValueChange={(value) => {
          handleFeatureChange("zcr", value);
        }}
        value={tempConfig.features.zcr ?? false}
      />
      <LabelSwitch
        label="Spectral Centroid"
        onValueChange={(value) => {
          handleFeatureChange("spectralCentroid", value);
        }}
        value={tempConfig.features.spectralCentroid ?? false}
      />
      <LabelSwitch
        label="Spectral Flatness"
        onValueChange={(value) => {
          handleFeatureChange("spectralFlatness", value);
        }}
        value={tempConfig.features.spectralFlatness ?? false}
      />
      <LabelSwitch
        label="mfcc"
        onValueChange={(value) => {
          handleFeatureChange("mfcc", value);
        }}
        value={tempConfig.features.mfcc ?? false}
      />
      <View style={styles.actionContainer}>
        <Button
          onPress={handleCancel}
          mode="outlined"
          style={styles.actionButton}
        >
          Cancel
        </Button>
        <Button
          onPress={handleSave}
          mode="contained"
          style={styles.actionButton}
        >
          Save
        </Button>
      </View>
    </View>
  );
};
