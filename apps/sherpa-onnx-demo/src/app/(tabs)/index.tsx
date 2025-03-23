import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Use a variable to hold the module to handle potential import errors
let SherpaOnnx: any;
try {
  SherpaOnnx = require('@siteed/sherpa-onnx.rn');
} catch (e) {
  console.error('Failed to import @siteed/sherpa-onnx.rn:', e);
}

// Check if Sherpa-ONNX is available and working
const SherpaOnnxDemo: React.FC = () => {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [platformSupport, setPlatformSupport] = useState<string>('Checking...');
  const [moduleInfo, setModuleInfo] = useState<string>('Checking...');

  useEffect(() => {
    // Simple check to see if we're on Android (current implementation only)
    const isAndroid = Platform.OS === 'android';
    setPlatformSupport(isAndroid ? 'Android: Supported' : 'iOS: Not yet implemented');
    
    try {
      // Check if the module is properly loaded
      const hasModule = SherpaOnnx !== undefined;
      setIsAvailable(hasModule);
      setModuleInfo(`Module loaded: ${hasModule ? Object.keys(SherpaOnnx).join(', ') : 'None'}`);
    } catch (error) {
      setIsAvailable(false);
      setModuleInfo(`Error: ${(error as Error).message}`);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sherpa-ONNX Demo</Text>
        <Text style={styles.subtitle}>Testing Native Integration</Text>
        
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Platform Status:</Text>
          <Text style={styles.status}>{platformSupport}</Text>
          
          <Text style={styles.statusTitle}>Sherpa-ONNX Available:</Text>
          <Text style={[
            styles.status, 
            isAvailable === null ? styles.neutral : 
            isAvailable ? styles.positive : styles.negative
          ]}>
            {isAvailable === null ? 'Checking...' : isAvailable ? 'Yes' : 'No'}
          </Text>

          <Text style={styles.statusTitle}>Module Info:</Text>
          <Text style={styles.status}>{moduleInfo}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  status: {
    fontSize: 16,
    marginBottom: 8,
  },
  positive: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  negative: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  neutral: {
    color: '#607D8B',
  },
});

export default SherpaOnnxDemo; 