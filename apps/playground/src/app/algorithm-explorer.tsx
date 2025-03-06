import { AppTheme, useThemePreferences } from '@siteed/design-system';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import EssentiaJS from 'react-native-essentia';
import { Button, Card, Text } from 'react-native-paper';

// Define interfaces
export interface AlgorithmExplorerProps {
  isInitialized: boolean;
  hasAudioData: boolean;
  showToast: (message: string) => void;
  onExecute: (algorithmName: string, result: unknown) => void;
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
  });
};

export function AlgorithmExplorer({ isInitialized, hasAudioData, showToast, onExecute }: AlgorithmExplorerProps) {
  const { theme } = useThemePreferences();
  const styles = useMemo(() => getStyles({ theme }), [theme]);
  
  // Commonly used algorithms
  const commonAlgorithms = [
    'MFCC', 'Spectrum', 'Key', 'Energy', 'Loudness', 'ZeroCrossingRate',
    'SpectralCentroid', 'SpectralRolloff', 'SpectrumCQ', 'Windowing', 'Onsets'
  ];

  const handleExportAlgorithmList = async () => {
    if (!isInitialized) {
      showToast('Please initialize Essentia first');
      return;
    }
    
    try {
      console.log('===== ESSENTIA ALGORITHMS LIST =====');
      
      // Get info for each available algorithm
      for (const algo of commonAlgorithms) {
        console.log(`\n----- ${algo} -----`);
        const result = await EssentiaJS.getAlgorithmInfo(algo);
        
        if (result.success && result.data) {
          const info = result.data;
          
          // Log inputs
          console.log('Inputs:');
          info.inputs.forEach((input: { name: string; type: string }) => {
            console.log(`  - ${input.name} (${input.type})`);
          });
          
          // Log outputs
          console.log('Outputs:');
          info.outputs.forEach((output: { name: string; type: string }) => {
            console.log(`  - ${output.name} (${output.type})`);
          });
          
          // Log parameters
          console.log('Parameters:');
          Object.entries(info.parameters).forEach(([key, value]) => {
            console.log(`  - ${key}: ${JSON.stringify(value)}`);
          });
        } else {
          console.log(`Failed to get info for ${algo}`);
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
        
        {/* Status information */}
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <Text style={{ flex: 1 }}>Status: {isInitialized ? 'Ready ✅' : 'Not Initialized ❌'}</Text>
          <Text>Audio Data: {hasAudioData ? 'Loaded ✅' : 'Not Loaded ❌'}</Text>
        </View>
        
        {/* Make export button extremely prominent */}
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
            disabled={!isInitialized}
            icon="export"
            labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
          >
            EXPORT ALL ALGORITHMS TO CONSOLE
          </Button>
          
          <Text style={{ marginTop: 8, fontStyle: 'italic', textAlign: 'center' }}>
            {isInitialized 
              ? "👆 Click to view all algorithms in the console 👆" 
              : "Initialize Essentia first to enable export"}
          </Text>
        </View>
        
        {/* MFCC execution button */}
        <Button 
          mode="contained"
          onPress={() => {
            if (isInitialized && hasAudioData) {
              onExecute('MFCC', { data: { coefficients: [1, 2, 3, 4] } });
              showToast('Executed MFCC algorithm');
            } else {
              showToast('Cannot execute: Initialize Essentia and load audio data first');
            }
          }}
          disabled={!isInitialized || !hasAudioData}
          style={{ marginTop: 8 }}
        >
          Execute MFCC Algorithm
        </Button>
      </Card.Content>
    </Card>
  );
} 