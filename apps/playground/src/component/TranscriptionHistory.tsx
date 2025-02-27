import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppTheme, Text, useTheme, Button, } from '@siteed/design-system';
import { Card } from 'react-native-paper';
import { TranscriptionLog } from '../hooks/useAudioTranscription';

interface TranscriptionHistoryProps {
  log: TranscriptionLog;
}

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    container: {
      marginTop: theme.margin.m,
      borderRadius: theme.roundness,
      overflow: 'hidden',
    },
    card: {
      backgroundColor: theme.colors.surfaceVariant,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.padding.s,
      paddingVertical: theme.padding.s,
      backgroundColor: theme.colors.primaryContainer,
    },
    title: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.onPrimaryContainer,
    },
    timestamp: {
      fontSize: 12,
      color: theme.colors.onPrimaryContainer,
      opacity: 0.8,
    },
    content: {
      padding: theme.padding.s,
    },
    logItem: {
      padding: theme.padding.s,
      gap: theme.spacing.gap,
    },
    logSection: {
      marginBottom: theme.margin.s,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      paddingBottom: theme.padding.s,
    },
    logSectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 8,
      color: theme.colors.primary,
    },
    logDetail: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 2,
    },
    logLabel: {
      fontWeight: '500',
      marginRight: 8,
      color: theme.colors.onSurfaceVariant,
    },
    logValue: {
      color: theme.colors.onSurface,
    },
    actionsContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: theme.margin.s,
      gap: theme.spacing.gap,
    },
    badge: {
      position: 'absolute',
      top: -5,
      right: -5,
      backgroundColor: theme.colors.primary,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    badgeText: {
      color: theme.colors.onPrimary,
      fontSize: 10,
      fontWeight: 'bold',
    },
    modelBadge: {
      backgroundColor: theme.colors.secondaryContainer,
      borderRadius: theme.roundness,
      paddingHorizontal: 8,
      paddingVertical: 2,
      alignSelf: 'flex-start',
      marginBottom: 4,
    },
    modelText: {
      color: theme.colors.onSecondaryContainer,
      fontSize: 12,
      fontWeight: 'bold',
    },
    transcriptContainer: {
      marginTop: theme.margin.m,
      padding: theme.padding.s,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.roundness,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
    transcriptText: {
      color: theme.colors.onSurface,
      lineHeight: 20,
    },
  });
};

export const TranscriptionHistory: React.FC<TranscriptionHistoryProps> = ({
  log,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme }), [theme]);
  const [showDetails, setShowDetails] = useState(false);

  const formattedDate = new Date(log.timestamp).toLocaleString();
  
  const handleViewDetails = () => {
    setShowDetails(!showDetails);
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Transcription Results</Text>
            <Text style={styles.timestamp}>{formattedDate}</Text>
          </View>
          <View style={styles.modelBadge}>
            <Text style={styles.modelText}>{log.modelId.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.content}>
          <View style={styles.logItem}>
            <View style={styles.logSection}>
              <Text style={styles.logSectionTitle}>File Information</Text>
              <View style={styles.logDetail}>
                <Text style={styles.logLabel}>Name:</Text>
                <Text style={styles.logValue}>{log.fileName}</Text>
              </View>
              <View style={styles.logDetail}>
                <Text style={styles.logLabel}>Original Size:</Text>
                <Text style={styles.logValue}>{(log.fileSize / (1024 * 1024)).toFixed(2)} MB</Text>
              </View>
              <View style={styles.logDetail}>
                <Text style={styles.logLabel}>Original Duration:</Text>
                <Text style={styles.logValue}>{log.fileDuration.toFixed(1)}s</Text>
              </View>
            </View>

            <View style={styles.logSection}>
              <Text style={styles.logSectionTitle}>Extracted Audio</Text>
              <View style={styles.logDetail}>
                <Text style={styles.logLabel}>Duration:</Text>
                <Text style={styles.logValue}>{log.extractedDuration.toFixed(1)}s</Text>
              </View>
              <View style={styles.logDetail}>
                <Text style={styles.logLabel}>Size:</Text>
                <Text style={styles.logValue}>{(log.extractedSize / (1024 * 1024)).toFixed(2)} MB</Text>
              </View>
            </View>

            <View style={styles.logSection}>
              <Text style={styles.logSectionTitle}>Processing</Text>
              <View style={styles.logDetail}>
                <Text style={styles.logLabel}>Processing Time:</Text>
                <Text style={styles.logValue}>{log.processingDuration.toFixed(1)}s</Text>
              </View>
              <View style={styles.logDetail}>
                <Text style={styles.logLabel}>Processing Speed:</Text>
                <Text style={styles.logValue}>{(log.extractedDuration / log.processingDuration).toFixed(1)}x</Text>
              </View>
            </View>
            
            <View style={styles.actionsContainer}>
              <Button 
                mode="contained" 
                onPress={handleViewDetails}
                icon="information-outline"
                style={{ paddingHorizontal: theme.padding.m }}
              >
                {showDetails ? "Hide Details" : "Details"}
              </Button>
            </View>
            
            {showDetails && log.transcript && (
              <View style={styles.transcriptContainer}>
                <Text style={styles.logSectionTitle}>Transcript</Text>
                <Text style={styles.transcriptText}>{log.transcript}</Text>
              </View>
            )}
          </View>
        </View>
      </Card>
    </View>
  );
};
