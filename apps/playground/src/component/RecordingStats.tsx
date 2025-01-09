import { useTheme } from "@siteed/design-system";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useState } from "react";

interface RecordingStatsProps {
  duration: number;
  size: number;
  compressedSize?: number;
  sampleRate?: number;
  bitDepth?: number;
  channels?: number;
  compression?: {
    enabled: boolean;
    format: string;
    bitrate?: number;
  };
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

export function RecordingStats({ 
  duration, 
  size,
  compressedSize,
  sampleRate,
  bitDepth,
  channels,
  compression 
}: RecordingStatsProps) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const animationHeight = useSharedValue(0);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    animationHeight.value = withTiming(isExpanded ? 0 : 120, { duration: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    height: animationHeight.value,
  }));

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surfaceVariant }]}>
      <TouchableOpacity onPress={toggleExpanded}>
        <View style={styles.container}>
          <View style={styles.statItem}>
            <Text
              variant="labelLarge"
              style={[styles.label, { color: colors.onSurfaceVariant }]}
            >
              Duration
            </Text>
            <Text
              variant="headlineSmall"
              style={[styles.value, { color: colors.primary }]}
            >
              {formatDuration(duration)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.outline }]} />
          <View style={styles.statItem}>
            <Text
              variant="labelLarge"
              style={[styles.label, { color: colors.onSurfaceVariant }]}
            >
              Size
            </Text>
            <Text
              variant="headlineSmall"
              style={[styles.value, { color: colors.primary }]}
            >
              {formatBytes(size)}
            </Text>
            {compression?.enabled && compressedSize && (
              <>
                <Text style={[styles.compressedLabel, { color: colors.onSurfaceVariant }]}>
                  Compressed
                </Text>
                <Text style={[styles.compressedValue, { color: colors.secondary }]}>
                  {formatBytes(compressedSize)}
                  {` (${((compressedSize / size) * 100).toFixed(1)}%)`}
                </Text>
              </>
            )}
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={24}
            color={colors.primary}
            style={styles.icon}
          />
        </View>
      </TouchableOpacity>

      <Animated.View style={[styles.expandedContent, animatedStyle]}>
        <View style={styles.detailsGrid}>
          {sampleRate && (
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>
                Sample Rate
              </Text>
              <Text style={[styles.detailValue, { color: colors.primary }]}>
                {sampleRate} Hz
              </Text>
            </View>
          )}
          {bitDepth && (
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>
                Bit Depth
              </Text>
              <Text style={[styles.detailValue, { color: colors.primary }]}>
                {bitDepth} bit
              </Text>
            </View>
          )}
          {channels && (
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>
                Channels
              </Text>
              <Text style={[styles.detailValue, { color: colors.primary }]}>
                {channels}
              </Text>
            </View>
          )}
          {compression && (
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>
                Compression
              </Text>
              <Text style={[styles.detailValue, { color: colors.primary }]}>
                {compression.format.toUpperCase()}
                {compression.bitrate ? ` ${compression.bitrate / 1000}kbps` : ''}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    marginVertical: 8,
    overflow: 'hidden',
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
  },
  value: {
    fontWeight: "bold",
  },
  divider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },
  icon: {
    position: 'absolute',
    right: 16,
  },
  expandedContent: {
    overflow: 'hidden',
  },
  detailsGrid: {
    padding: 16,
    paddingTop: 0,
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
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  compressedLabel: {
    fontSize: 12,
    marginTop: 8,
  },
  compressedValue: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 