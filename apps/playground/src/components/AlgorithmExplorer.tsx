import { AppTheme, useThemePreferences } from '@siteed/design-system';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import EssentiaJS from 'react-native-essentia';
import { Button, Card, Text } from 'react-native-paper';

// Define interfaces
export interface AlgorithmExplorerProps {
  isInitialized: boolean;
  showToast: (message: string) => void;
  onExecute?: (algorithmName: string, result: unknown) => void;
}

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    card: {
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    cardContent: {
      fontSize: 16,
      marginBottom: 16,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
    },
    button: {
      flex: 1,
      margin: 4,
    },
    resultText: {
      fontFamily: 'monospace',
      fontSize: 14,
      backgroundColor: theme.colors.surfaceVariant,
      padding: 8,
      borderRadius: 4,
      marginTop: 8,
    },
    sampleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    selectedSample: {
      backgroundColor: theme.colors.primaryContainer,
    },
    testResult: {
      marginTop: 8,
      padding: 8,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 4,
    },
    chipContainer: {
      flexDirection: 'row',
      marginVertical: 8,
      maxHeight: 48,
    },
    chip: {
      marginRight: 8,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginTop: 12,
      marginBottom: 4,
    },
    item: {
      fontSize: 14,
      marginLeft: 8,
      marginBottom: 2,
    },
    loadingContainer: {
      padding: 16,
      alignItems: 'center',
    },
    errorText: {
      color: theme.colors.error,
      marginVertical: 8,
    },
    algorithmCount: {
      marginTop: 8,
      fontStyle: 'italic',
    }
  });
};

export function AlgorithmExplorer({ isInitialized, showToast }: AlgorithmExplorerProps) {
  const { theme } = useThemePreferences();
  const styles = useMemo(() => getStyles({ theme }), [theme]);
  
  // State for algorithms list
  const [algorithms, setAlgorithms] = useState<string[]>([]);
  const [isLoadingAlgorithms, setIsLoadingAlgorithms] = useState(false);
  const [algorithmError, setAlgorithmError] = useState<string | null>(null);
  

  // Function to load all available algorithms
  const loadAlgorithms = useCallback(async () => {
    if (!isInitialized) {
      showToast('Please initialize Essentia first');
      return;
    }
    
    setIsLoadingAlgorithms(true);
    setAlgorithmError(null);
    
    try {
      const result = await EssentiaJS.getAllAlgorithms();
      
      if (result.success && Array.isArray(result.data)) {
        setAlgorithms(result.data);
        console.log(`Loaded ${result.data.length} algorithms from Essentia`);
      } else {
        setAlgorithmError('Failed to load algorithms');
        console.error('Unexpected result format:', result);
      }
    } catch (error) {
      setAlgorithmError(`Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Error loading algorithms:', error);
    } finally {
      setIsLoadingAlgorithms(false);
    }
  }, [isInitialized, showToast]);


  // Load algorithms when initialized
  useEffect(() => {
    if (isInitialized) {
      loadAlgorithms();
    }
  }, [isInitialized, loadAlgorithms]);
  
  const handleExportAlgorithmList = async () => {
    if (!isInitialized) {
      showToast('Please initialize Essentia first');
      return;
    }
    
    if (algorithms.length === 0) {
      showToast('No algorithms available. Try refreshing the list.');
      return;
    }
    
    try {
      console.log('===== ESSENTIA ALGORITHMS LIST =====');
      console.log(`Total available algorithms: ${algorithms.length}`);
      
      // List all algorithms alphabetically
      console.log('\nAll available algorithms (alphabetical):');
      const sortedAlgorithms = [...algorithms].sort();
      console.log(sortedAlgorithms.join(', '));
      
      // For better performance, limit the detailed info to first 20 algorithms
      const algoSubset = algorithms.length > 20 ? algorithms.slice(0, 20) : algorithms;
      
      console.log('\nDetailed information for first 20 algorithms:');
      
      // Get info for each algorithm in the subset
      for (const algo of algoSubset) {
        console.log(`\n----- ${algo} -----`);
        try {
          const result = await EssentiaJS.getAlgorithmInfo(algo);
          
          if (result.success && result.data) {
            const info = result.data;
            
            // Log inputs
            console.log('Inputs:');
            if (info.inputs && Array.isArray(info.inputs)) {
              info.inputs.forEach((input: { name: string; type: string }) => {
                console.log(`  - ${input.name} (${input.type})`);
              });
            } else {
              console.log('  None or undefined');
            }
            
            // Log outputs
            console.log('Outputs:');
            if (info.outputs && Array.isArray(info.outputs)) {
              info.outputs.forEach((output: { name: string; type: string }) => {
                console.log(`  - ${output.name} (${output.type})`);
              });
            } else {
              console.log('  None or undefined');
            }
            
            // Log parameters
            console.log('Parameters:');
            if (info.parameters) {
              Object.entries(info.parameters).forEach(([key, value]) => {
                console.log(`  - ${key}: ${JSON.stringify(value)}`);
              });
            } else {
              console.log('  None or undefined');
            }
          } else {
            console.log(`Failed to get info for ${algo}: ${result.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.error(`Error getting info for ${algo}:`, error);
        }
      }
      
      console.log('\n===== END OF ALGORITHMS LIST =====');
      showToast('Algorithm list exported to console');
    } catch (error) {
      console.error('Error exporting algorithm list:', error);
      showToast(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  return (
    <Card style={[styles.card, { borderWidth: 2, borderColor: theme.colors.primary }]}>
      <Card.Content>
        <Text style={[styles.cardTitle, { fontSize: 20 }]}>Algorithm Explorer</Text>
        
        {/* Status information - simplified */}
        <View style={{ marginBottom: 12 }}>
          <Text>Status: {isInitialized ? 'Ready ✅' : 'Not Initialized ❌'}</Text>
        </View>
        
        {/* Algorithm count */}
        {algorithms.length > 0 && (
          <Text style={styles.algorithmCount}>
            {algorithms.length} algorithms available
          </Text>
        )}
        
        {/* Loading state */}
        {isLoadingAlgorithms && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 8 }}>Loading algorithms...</Text>
          </View>
        )}
        
        {/* Error state */}
        {algorithmError && (
          <Text style={styles.errorText}>{algorithmError}</Text>
        )}
        
        {/* Refresh button */}
        <Button 
          mode="outlined"
          onPress={loadAlgorithms}
          disabled={!isInitialized || isLoadingAlgorithms}
          icon="refresh"
          style={{ marginTop: 8, marginBottom: 16 }}
        >
          Refresh Algorithm List
        </Button>
        
        {/* Export button */}
        <View style={{ 
          backgroundColor: theme.colors.primaryContainer, 
          padding: 16, 
          borderRadius: 8,
          marginBottom: 16
        }}>
          <Text style={[styles.cardContent, { fontWeight: 'bold', marginBottom: 8 }]}>
            Export all algorithms with their parameters:
          </Text>
          
          <Button 
            mode="contained"
            onPress={handleExportAlgorithmList}
            disabled={!isInitialized || algorithms.length === 0 || isLoadingAlgorithms}
            icon="export"
            labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
          >
            EXPORT ALL ALGORITHMS TO CONSOLE
          </Button>
          
          <Text style={{ marginTop: 8, fontStyle: 'italic', textAlign: 'center' }}>
            {!isInitialized 
              ? "Initialize Essentia first to enable export"
              : algorithms.length === 0
                ? "Load algorithms first"
                : "👆 Click to view all algorithms in the console 👆"}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
} 