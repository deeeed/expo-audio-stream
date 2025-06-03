import SherpaOnnx from '@siteed/sherpa-onnx.rn';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ValidateResult, SystemInfo } from '@siteed/sherpa-onnx.rn/src/types/interfaces';

const SherpaOnnxDemo: React.FC = () => {
  const router = useRouter();
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [validationResult, setValidationResult] = useState<string>('Not validated');
  const [archInfo, setArchInfo] = useState<string>('Unknown');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [systemInfoError, setSystemInfoError] = useState<string | null>(null);
  const [integrationTestResult, setIntegrationTestResult] = useState<string>('Not tested');

  useEffect(() => {
    // Check architecture type
    const isBridgeless = !!(global as any).RN$Bridgeless;
    const archType = isBridgeless ? 'New/Bridgeless' : 'Old/Bridge';
    setArchInfo(archType);
    
    try {
      // Check if the module is properly loaded
      const hasModule = SherpaOnnx !== undefined;
      setIsAvailable(hasModule);
      
      // Try to validate the library and get system info
      if (hasModule) {
        // Validate library
        SherpaOnnx.validateLibraryLoaded()
          .then((result: ValidateResult) => {
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
        
        // Get comprehensive system information
        SherpaOnnx.getSystemInfo()
          .then((info: SystemInfo) => {
            console.log('📊 System Info Retrieved:', info);
            setSystemInfo(info);
            
            // Update architecture info with detailed information
            const detailedArch = `${info.architecture.type.toUpperCase()} (${info.architecture.description})`;
            setArchInfo(detailedArch);
            
            setSystemInfoError(null);
          })
          .catch((error: Error) => {
            console.error('System info error:', error);
            setSystemInfoError(error.message);
          });
      }
    } catch (error) {
      setIsAvailable(false);
      console.error('Module loading error details:', error);
    }
  }, []);

  const testNativeIntegration = async (): Promise<void> => {
    try {
      setIntegrationTestResult('Testing...');
      
      const result = await SherpaOnnx.testOnnxIntegration();
      console.log('Integration test result:', result);
      
      setIntegrationTestResult(
        `Test complete:\n` +
        `Status: ${result.status}\n` +
        `Success: ${result.success ? 'Yes' : 'No'}`
      );
    } catch (error) {
      console.error('Test failed:', error);
      setIntegrationTestResult(`Test failed: ${(error as Error).message}`);
    }
  };

  // Helper function to navigate to a tab
  const navigateToTab = (tab: string) => {
    router.navigate(`/${tab}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Sherpa-ONNX Demo</Text>
        <Text style={styles.subtitle}>System Status</Text>
        
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>React Native Architecture:</Text>
          <Text style={styles.status}>{archInfo}</Text>
          
          <Text style={styles.statusTitle}>Sherpa-ONNX Available:</Text>
          <Text style={[
            styles.status, 
            isAvailable === null ? styles.neutral : 
            isAvailable ? styles.positive : styles.negative
          ]}>
            {isAvailable === null ? 'Checking...' : isAvailable ? 'Yes' : 'No'}
          </Text>
          
          <Text style={styles.statusTitle}>Library Validation:</Text>
          <Text style={styles.status}>{validationResult}</Text>

          {/* System Information Display */}
          {systemInfo && (
            <View style={styles.systemInfoContainer}>
              <Text style={styles.systemInfoTitle}>📊 System Information</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Platform:</Text>
                <Text style={styles.infoValue}>{Platform.OS} {systemInfo.device?.iosVersion || systemInfo.device?.androidVersion || ''}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Device:</Text>
                <Text style={styles.infoValue}>{systemInfo.device?.brand} {systemInfo.device?.model}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>CPU Cores:</Text>
                <Text style={styles.infoValue}>{systemInfo.cpu?.availableProcessors}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Memory:</Text>
                <Text style={styles.infoValue}>
                  {systemInfo.memory?.usedMemoryMB?.toFixed(1)}MB / {systemInfo.memory?.totalMemoryMB?.toFixed(1)}MB
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Architecture Type:</Text>
                <Text style={[
                  styles.infoValue,
                  systemInfo.architecture.type === 'new' ? styles.positive : styles.neutral
                ]}>
                  {systemInfo.architecture.type.toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Native Library:</Text>
                <Text style={[
                  styles.infoValue,
                  systemInfo.libraryLoaded ? styles.positive : styles.negative
                ]}>
                  {systemInfo.libraryLoaded ? 'Loaded' : 'Not Loaded'}
                </Text>
              </View>
              
              {Platform.OS === 'ios' && systemInfo.gpu?.metalVersion && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Metal GPU:</Text>
                  <Text style={styles.infoValue}>{systemInfo.gpu.metalVersion}</Text>
                </View>
              )}
              
              {Platform.OS === 'android' && systemInfo.gpu?.openGLESVersion && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>OpenGL ES:</Text>
                  <Text style={styles.infoValue}>{systemInfo.gpu.openGLESVersion}</Text>
                </View>
              )}
              
              {Platform.OS === 'web' && systemInfo.gpu?.webGLVersion && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>WebGL:</Text>
                  <Text style={styles.infoValue}>{systemInfo.gpu.webGLVersion}</Text>
                </View>
              )}
            </View>
          )}
          
          {systemInfoError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>⚠️ System Info Error:</Text>
              <Text style={styles.errorText}>{systemInfoError}</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.testButton, !isAvailable && styles.buttonDisabled]}
            onPress={testNativeIntegration}
            disabled={!isAvailable}
          >
            <Text style={styles.testButtonText}>Test C Library Integration</Text>
          </TouchableOpacity>

          <Text style={[styles.status, styles.testResult]}>{integrationTestResult}</Text>
        </View>

        <View style={styles.featuresCard}>
          <Text style={styles.cardTitle}>Available Features</Text>
          
          <TouchableOpacity 
            style={styles.featureItem}
            onPress={() => navigateToTab('tts')}
            disabled={!isAvailable}
          >
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureName}>Text-to-Speech</Text>
              <Text style={styles.featureDesc}>
                Convert text to natural-sounding speech using Sherpa-ONNX models
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.featureButton, !isAvailable && styles.buttonDisabled]}
              onPress={() => navigateToTab('tts')}
              disabled={!isAvailable}
            >
              <Text style={styles.featureButtonText}>Try TTS</Text>
            </TouchableOpacity>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.featureItem}
            onPress={() => navigateToTab('asr')}
            disabled={!isAvailable}
          >
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureName}>Automatic Speech Recognition</Text>
              <Text style={styles.featureDesc}>
                Convert speech to text using Sherpa-ONNX models
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.featureButton, !isAvailable && styles.buttonDisabled]}
              onPress={() => navigateToTab('asr')}
              disabled={!isAvailable}
            >
              <Text style={styles.featureButtonText}>Try ASR</Text>
            </TouchableOpacity>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.featureItem}
            onPress={() => navigateToTab('audio-tagging')}
            disabled={!isAvailable}
          >
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureName}>Audio Tagging</Text>
              <Text style={styles.featureDesc}>
                Identify and classify sounds in audio recordings
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.featureButton, !isAvailable && styles.buttonDisabled]}
              onPress={() => navigateToTab('audio-tagging')}
              disabled={!isAvailable}
            >
              <Text style={styles.featureButtonText}>Try Audio Tagging</Text>
            </TouchableOpacity>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.featureItem}
            onPress={() => navigateToTab('speaker-id')}
            disabled={!isAvailable}
          >
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureName}>Speaker Identification</Text>
              <Text style={styles.featureDesc}>
                Recognize and identify speakers from voice recordings
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.featureButton, !isAvailable && styles.buttonDisabled]}
              onPress={() => navigateToTab('speaker-id')}
              disabled={!isAvailable}
            >
              <Text style={styles.featureButtonText}>Try Speaker ID</Text>
            </TouchableOpacity>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.featureItem}
            onPress={() => navigateToTab('models')}
          >
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureName}>Model Management</Text>
              <Text style={styles.featureDesc}>
                Download, manage, and explore Sherpa-ONNX models
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.featureButton}
              onPress={() => navigateToTab('models')}
            >
              <Text style={styles.featureButtonText}>Manage Models</Text>
            </TouchableOpacity>
          </TouchableOpacity>
          
          {Platform.OS === 'web' && (
            <TouchableOpacity 
              style={styles.featureItem}
              onPress={() => navigateToTab('web-test')}
            >
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureName}>Web-specific Tests</Text>
                <Text style={styles.featureDesc}>
                  Tests specific to the web platform using WebAssembly
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.featureButton}
                onPress={() => navigateToTab('web-test')}
              >
                <Text style={styles.featureButtonText}>Try Web Tests</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
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
  testResult: {
    marginTop: 8,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
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
  testButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  featureButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
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
  systemInfoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  systemInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#495057',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#212529',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    flex: 1,
    textAlign: 'right',
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#856404',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
});

export default SherpaOnnxDemo; 