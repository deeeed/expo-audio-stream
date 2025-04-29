import React, { useState, useMemo } from "react";
import { useTheme, AppTheme } from "@siteed/design-system";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { AudioDevice, CompressionInfo } from "@siteed/expo-audio-studio";

interface RecordingStatsProps {
  readonly duration: number;
  readonly size: number;
  readonly sampleRate?: number;
  readonly bitDepth?: number;
  readonly channels?: number;
  readonly compression?: CompressionInfo;
  readonly device?: AudioDevice | null;
}

function formatDuration(durationMs: number) {
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const getStyles = (theme: AppTheme) => StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    marginVertical: 8,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceVariant,
  },
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  label: {
    marginBottom: 4,
    color: theme.colors.onSurfaceVariant,
  },
  value: {
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  divider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
    backgroundColor: theme.colors.outline,
  },
  icon: {
    position: 'absolute',
    right: 16,
    top: 10,
    color: theme.colors.primary,
  },
  expandedContent: {
    overflow: 'hidden',
  },
  detailsGrid: {
    padding: 16,
    paddingTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
    color: theme.colors.onSurfaceVariant,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  rawSizeLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  compressionRatio: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionDivider: {
    width: '100%',
    marginTop: 8,
    marginBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.onSurfaceVariant,
  },
  audioSpecsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  specItem: {
    flex: 1,
    alignItems: 'center',
  },
});

export function RecordingStats({ 
  duration, 
  size,
  compression,
  sampleRate,
  bitDepth,
  channels,
  device
}: RecordingStatsProps) {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const animationHeight = useSharedValue(0);
  const styles = useMemo(() => getStyles(theme), [theme]);

  const toggleExpanded = () => {
    const newIsExpanded = !isExpanded;
    setIsExpanded(newIsExpanded);
    // Calculate the expanded height based on what sections are shown
    let expandedHeight = 100; // Base height for audio specs
    if (compression) expandedHeight += 120; // Add height for compression section
    if (device) expandedHeight += 100; // Add height for device section
    animationHeight.value = withTiming(newIsExpanded ? expandedHeight : 0, { duration: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    height: animationHeight.value,
    opacity: animationHeight.value === 0 ? 0 : 1,
  }));

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity onPress={toggleExpanded}>
        <View style={styles.container}>
          <View style={styles.statItem}>
            <Text
              variant="labelLarge"
              style={styles.label}
            >
              Duration
            </Text>
            <Text
              variant="headlineSmall"
              style={styles.value}
            >
              {formatDuration(duration)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text
              variant="labelLarge"
              style={styles.label}
            >
              Size
            </Text>
            <Text
              variant="headlineSmall"
              style={styles.value}
            >
              {compression ? formatBytes(compression.size) : formatBytes(size)}
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={24}
            style={styles.icon}
          />
        </View>
      </TouchableOpacity>

      <Animated.View style={[styles.expandedContent, animatedStyle]}>
        <View 
          style={styles.detailsGrid}
        >
          {/* Audio specs section */}
          <View style={styles.audioSpecsRow}>
            {(sampleRate) && (
              <View style={styles.specItem}>
                <Text style={styles.detailLabel}>
                  Sample Rate
                </Text>
                <Text style={styles.detailValue}>
                  {sampleRate} Hz
                </Text>
              </View>
            )}
            {(bitDepth) && (
              <View style={styles.specItem}>
                <Text style={styles.detailLabel}>
                  Bit Depth
                </Text>
                <Text style={styles.detailValue}>
                  {bitDepth} bit
                </Text>
              </View>
            )}
            {(channels) && (
              <View style={styles.specItem}>
                <Text style={styles.detailLabel}>
                  Channels
                </Text>
                <Text style={styles.detailValue}>
                  {channels}
                </Text>
              </View>
            )}
          </View>

          {/* Device information section */}
          {device && (
            <>
              <View style={styles.sectionDivider}>
                <Text style={styles.sectionTitle}>
                  Input Device
                </Text>
              </View>
              
              <View style={styles.audioSpecsRow}>
                <View style={styles.specItem}>
                  <Text style={styles.detailLabel}>
                    Device
                  </Text>
                  <Text style={styles.detailValue}>
                    {device.name}
                  </Text>
                </View>

                <View style={styles.specItem}>
                  <Text style={styles.detailLabel}>
                    Type
                  </Text>
                  <Text style={styles.detailValue}>
                    {device.type.replace('_', ' ')}
                  </Text>
                </View>

                {device.isDefault && (
                  <View style={styles.specItem}>
                    <Text style={styles.detailLabel}>
                      Default
                    </Text>
                    <Text style={styles.detailValue}>
                      Yes
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Compression section */}
          {(compression) && (
            <>
              <View style={styles.sectionDivider}>
                <Text style={styles.sectionTitle}>
                  Storage Details
                </Text>
              </View>
              
              <View style={styles.audioSpecsRow}>
                <View style={styles.specItem}>
                  <Text style={styles.detailLabel}>
                    Format
                  </Text>
                  <Text style={styles.detailValue}>
                    {compression.format.toUpperCase()}
                    {(compression.bitrate) ? ` (${(compression.bitrate / 1000).toFixed(0)} kbps)` : ''}
                  </Text>
                </View>

                <View style={styles.specItem}>
                  <Text style={styles.detailLabel}>
                    Uncompressed Size
                  </Text>
                  <Text style={styles.detailValue}>
                    {formatBytes(size)}
                  </Text>
                </View>

                <View style={styles.specItem}>
                  <Text style={styles.detailLabel}>
                    Size Reduction
                  </Text>
                  <Text style={styles.detailValue}>
                    {((1 - compression.size / size) * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
} 