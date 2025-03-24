import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Platform, TouchableOpacity, ScrollView, NativeModules } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import SherpaOnnx from '@siteed/sherpa-onnx.rn';

const SherpaOnnxDemo: React.FC = () => {
  const router = useRouter();
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [platformSupport, setPlatformSupport] = useState<string>('Checking...');
  const [moduleInfo, setModuleInfo] = useState<string>('Checking...');
  const [validationResult, setValidationResult] = useState<string>('Not validated');
  const [nativeModulesInfo, setNativeModulesInfo] = useState<string>('Loading...');

  useEffect(() => {
    // Simple check to see if we're on Android (current implementation only)
    const isAndroid = Platform.OS === 'android';
    setPlatformSupport(isAndroid ? 'Android: Supported' : 'iOS: Not yet implemented');
    
    // Check available native modules
    try {
      const availableModules = Object.keys(NativeModules);
      setNativeModulesInfo(`Available native modules: ${availableModules.join(', ')}`);
    } catch (error) {
      setNativeModulesInfo(`Error getting native modules: ${(error as Error).message}`);
    }
    
    try {
      // Check if the module is properly loaded
      const hasModule = SherpaOnnx !== undefined;
      setIsAvailable(hasModule);
      setModuleInfo(`Module loaded: ${hasModule ? 'Yes' : 'No'}`);
      
      // Try to validate the library
      if (hasModule && SherpaOnnx.validateLibraryLoaded) {
        SherpaOnnx.validateLibraryLoaded()
          .then((result: any) => {
            setValidationResult(`Library validation: ${result.loaded ? 'Success' : 'Failed'} - ${result.status}`);
            
            // Add more details on error
            if (!result.loaded) {
              console.error(`Validation details: ${JSON.stringify(result)}`);
            }
          })
          .catch((error: Error) => {
            setValidationResult(`Validation error: ${error.message}`);
            console.error('Validation error details:', error);
          });
      }
    } catch (error) {
      setIsAvailable(false);
      setModuleInfo(`Error: ${(error as Error).message}`);
      console.error('Module loading error details:', error);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Sherpa-ONNX Demo</Text>
        <Text style={styles.subtitle}>Testing Native Integration</Text>
        
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Platform Status:</Text>
          <Text style={styles.status}>{platformSupport}</Text>
          
          <Text style={styles.statusTitle}>Native Modules:</Text>
          <Text style={styles.status}>{nativeModulesInfo}</Text>
          
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
          
          <Text style={styles.statusTitle}>Validation:</Text>
          <Text style={styles.status}>{validationResult}</Text>
        </View>

        <View style={styles.featuresCard}>
          <Text style={styles.cardTitle}>Available Features</Text>
          
          <View style={styles.featureItem}>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureName}>Text-to-Speech</Text>
              <Text style={styles.featureDesc}>
                Convert text to natural-sounding speech using Sherpa-ONNX models
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.featureButton, !isAvailable && styles.buttonDisabled]}
              onPress={() => router.push('/tts')}
              disabled={!isAvailable}
            >
              <Text style={styles.featureButtonText}>Try TTS</Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.featureItem, styles.featureItemDisabled]}>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureName}>Speech-to-Text</Text>
              <Text style={styles.featureDesc}>
                Convert speech to text using Sherpa-ONNX models (Coming soon)
              </Text>
            </View>
            
            <TouchableOpacity style={[styles.featureButton, styles.buttonDisabled]}>
              <Text style={styles.featureButtonText}>Coming Soon</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>
          Sherpa-ONNX Demo • Version 0.1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
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
  featureItem: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  featureItemDisabled: {
    opacity: 0.7,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: '#666',
  },
  featureButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  featureButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  footer: {
    marginTop: 8,
    textAlign: 'center',
    color: '#757575',
    fontSize: 12,
  },
});

export default SherpaOnnxDemo; 