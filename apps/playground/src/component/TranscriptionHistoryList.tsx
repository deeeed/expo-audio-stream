import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity } from 'react-native';
import { AppTheme, Text, useTheme, Button } from '@siteed/design-system';
import { TranscriptionLog } from '../hooks/useAudioTranscription';
import { TranscriptionHistory } from './TranscriptionHistory';

interface TranscriptionHistoryListProps {
  currentLog?: TranscriptionLog | null;
  useVirtualizedList?: boolean;
}

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    container: {
      marginTop: theme.margin.m,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.margin.s,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.onBackground,
    },
    emptyContainer: {
      padding: theme.padding.m,
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.roundness,
    },
    emptyText: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.margin.s,
    },
    listContainer: {
      gap: theme.spacing.gap,
    },
    filterContainer: {
      flexDirection: 'row',
      marginBottom: theme.margin.s,
      gap: theme.spacing.gap / 2,
      flexWrap: 'wrap',
    },
    filterButton: {
      paddingHorizontal: theme.padding.s,
      paddingVertical: theme.padding.s,
      borderRadius: theme.roundness,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
    filterButtonActive: {
      backgroundColor: theme.colors.primaryContainer,
      borderColor: theme.colors.primary,
    },
    filterText: {
      fontSize: 12,
    },
    filterTextActive: {
      color: theme.colors.onPrimaryContainer,
      fontWeight: 'bold',
    },
  });
};

export const TranscriptionHistoryList: React.FC<TranscriptionHistoryListProps> = ({
  currentLog,
  useVirtualizedList = true,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme }), [theme]);
  const [history, setHistory] = useState<TranscriptionLog[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);

  // Update the effect to respect the cleared state
  useEffect(() => {
    if (currentLog && !cleared) {
      // Check if this log is already in history
      const exists = history.some(
        (item) => 
          item.timestamp === currentLog.timestamp && 
          item.fileName === currentLog.fileName &&
          item.modelId === currentLog.modelId
      );
      
      if (!exists) {
        setHistory(prevHistory => [currentLog, ...prevHistory]);
      }
    }
  }, [currentLog, history, cleared]);

  // Get unique model IDs for filtering
  const modelIds = useMemo(() => {
    const ids = new Set(history.map(log => log.modelId));
    return Array.from(ids);
  }, [history]);

  // Filter history based on selected model
  const filteredHistory = useMemo(() => {
    if (!filter) return history;
    return history.filter(log => log.modelId === filter);
  }, [history, filter]);

  const handleClearHistory = () => {
    setHistory([]);
    setCleared(true);
  };

  if (history.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Transcription History</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transcription history yet</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transcription History</Text>
        <Button 
          mode="outlined" 
          onPress={handleClearHistory}
          icon="delete"
          compact
          style={{ paddingHorizontal: theme.padding.m }}
        >
          Clear
        </Button>
      </View>

      {modelIds.length > 1 && (
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              !filter && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(null)}
          >
            <Text style={[
              styles.filterText,
              !filter && styles.filterTextActive,
            ]}>
              All Models
            </Text>
          </TouchableOpacity>
          
          {modelIds.map(id => (
            <TouchableOpacity
              key={id}
              style={[
                styles.filterButton,
                filter === id && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(id)}
            >
              <Text style={[
                styles.filterText,
                filter === id && styles.filterTextActive,
              ]}>
                {id.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {useVirtualizedList ? (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => `${item.timestamp}-${item.modelId}`}
          renderItem={({ item }) => (
            <TranscriptionHistory 
              log={item} 
            />
          )}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      ) : (
        <View style={styles.listContainer}>
          {filteredHistory.map(item => (
            <React.Fragment key={`${item.timestamp}-${item.modelId}`}>
              <TranscriptionHistory log={item} />
              <View style={{ height: 12 }} />
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );
};

export default TranscriptionHistoryList; 