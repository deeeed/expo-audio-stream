import { Text, useTheme } from '@siteed/design-system';
import { AudioDevice, useAudioDevices } from '@siteed/expo-audio-studio';
import * as Device from 'expo-device';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Divider } from 'react-native-paper';

import { AudioDeviceSelector } from '../component/AudioDeviceSelector';

/**
 * Cross-platform test component for audio device detection and selection
 */
export function AudioDeviceTest() {
  const {
    devices,
    currentDevice,
    error,
    resetToDefaultDevice,
    refreshDevices,
    selectDevice,
  } = useAudioDevices();
  const theme = useTheme();

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(
    currentDevice?.id || (devices.length > 0 ? devices[0].id : undefined)
  );
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [selectedDeviceCapabilities, setSelectedDeviceCapabilities] = useState<{ property: string, value: string }[]>([]);
  const [platformInfo, setPlatformInfo] = useState<string>('');

  // Get platform information on mount
  useEffect(() => {
    const getPlatformInfo = async () => {
      let info;
      
      if (Platform.OS === 'web') {
        // For web, don't show the version if undefined
        info = `Platform: ${Platform.OS}`;
        
        // Get browser information
        const browserInfo = navigator.userAgent;
        // Extract browser name and version for cleaner display
        let browserName = 'Unknown Browser';
        
        if (browserInfo.includes('Chrome/')) {
          browserName = 'Chrome';
        } else if (browserInfo.includes('Firefox/')) {
          browserName = 'Firefox';
        } else if (browserInfo.includes('Safari/') && !browserInfo.includes('Chrome/')) {
          browserName = 'Safari';
        } else if (browserInfo.includes('Edge/') || browserInfo.includes('Edg/')) {
          browserName = 'Edge';
        }
        
        info += `\nBrowser: ${browserName}`;
        info += `\nUser Agent: ${browserInfo}`;
      } else {
        // For native platforms
        info = `Platform: ${Platform.OS} ${Platform.Version || ''}`;
        
        const deviceInfo = await Device.getDeviceTypeAsync();
        const deviceModel = Device.modelName || 'Unknown';
        info += `\nDevice: ${deviceModel}`;
        info += `\nType: ${deviceTypeToString(deviceInfo)}`;
      }
      
      setPlatformInfo(info);
    };
    
    getPlatformInfo();
  }, []);

  // Helper function to convert device type to string
  const deviceTypeToString = (type: Device.DeviceType): string => {
    switch (type) {
      case Device.DeviceType.PHONE: return 'Phone';
      case Device.DeviceType.TABLET: return 'Tablet';
      case Device.DeviceType.DESKTOP: return 'Desktop';
      case Device.DeviceType.TV: return 'TV';
      default: return 'Unknown';
    }
  };

  // Update selectedDeviceId when currentDevice changes
  useEffect(() => {
    if (currentDevice && (!selectedDeviceId || selectedDeviceId !== currentDevice.id)) {
      setSelectedDeviceId(currentDevice.id);
    } else if (!selectedDeviceId && devices.length > 0) {
      // If no device is selected, select the first available one
      setSelectedDeviceId(devices[0].id);
      selectDevice(devices[0].id);
    }
  }, [currentDevice, devices, selectedDeviceId, selectDevice]);

  // Update capabilities info when selectedDeviceId changes
  useEffect(() => {
    if (selectedDeviceId) {
      const device = devices.find(d => d.id === selectedDeviceId);
      if (device) {
        const caps = device.capabilities;
        // Don't join with newlines anymore, we'll display each property individually
        const capsData = [
          { property: 'Device Type', value: device.type },
          { property: 'Sample Rates', value: `${caps.sampleRates?.join(', ') || 'Unknown'} Hz` },
          { property: 'Channels', value: `${caps.channelCounts?.join(', ') || 'Unknown'}` },
          { property: 'Bit Depth', value: `${caps.bitDepths?.join(', ') || 'Unknown'} bit` },
          { property: 'Echo Cancellation', value: caps.hasEchoCancellation ? 'Yes' : 'No' },
          { property: 'Noise Suppression', value: caps.hasNoiseSuppression ? 'Yes' : 'No' }
        ];
        
        // Just store the data array instead of a joined string
        setSelectedDeviceCapabilities(capsData);
      }
    }
  }, [selectedDeviceId, devices]);

  // Add information about audio capabilities
  const webAudioInfo = 
    "Note: Web Audio API doesn't provide a way to query exact device capabilities. " +
    "The Web Audio API uses 32-bit float internally, but actual hardware support " +
    "varies by browser and device. Most browsers support all the listed capabilities " +
    "but may perform conversions behind the scenes.";

  const nativeAudioInfo = 
    "Note: Native platforms may automatically configure the optimal audio settings " +
    "based on the device capabilities and system settings. The reported values represent " +
    "what the system has configured for use.";

  const handleDeviceSelected = useCallback((device: AudioDevice) => {
    console.log('Device selected:', device.name, device.id);
    setSelectedDeviceId(device.id);
    selectDevice(device.id);
  }, [selectDevice]);

  const runDeviceTest = useCallback(async () => {
    try {
      setTestStatus('running');
      setTestResult('Testing audio device access...');

      if (!selectedDeviceId) {
        throw new Error('No device selected');
      }

      if (Platform.OS === 'web') {
        // Web-specific test
        await navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedDeviceId } });
        setTestResult('Successfully accessed microphone!');
        
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = mediaDevices.filter(device => device.kind === 'audioinput');
        
        setTestResult(
          `Success! Found ${audioInputs.length} audio input devices.\n` +
          `Selected device: ${currentDevice?.name || 'None'}\n` +
          `Device IDs: ${audioInputs.map(d => d.deviceId.substring(0, 8) + '...').join(', ')}\n` +
          `${audioInputs.some(d => !d.label) ? 'Some devices have no labels due to browser privacy restrictions.' : 'All devices have labels.'}`
        );
      } else {
        // Native test
        // Most of the device access is already handled by the AudioDeviceManager
        // Just verify the selected device and report success
        const device = devices.find(d => d.id === selectedDeviceId);
        
        if (!device) {
          throw new Error('Selected device not found');
        }
        
        setTestResult(
          `Success! Verified device selection.\n` +
          `Selected device: ${device.name}\n` +
          `Device Type: ${device.type}\n` +
          `Is Default: ${device.isDefault ? 'Yes' : 'No'}\n` +
          `Available: ${device.isAvailable ? 'Yes' : 'No'}`
        );
      }
      
      setTestStatus('success');
    } catch (err) {
      console.error('Device test failed:', err);
      setTestResult(`Test failed: ${err instanceof Error ? err.message : String(err)}`);
      setTestStatus('error');
    }
  }, [selectedDeviceId, currentDevice, devices]);

  const resetTest = useCallback(() => {
    setTestResult(null);
    setTestStatus('idle');
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
    },
    description: {
      marginBottom: 16,
    },
    card: {
      marginBottom: 16,
      backgroundColor: theme.colors.surface,
    },
    testCard: {
      backgroundColor: theme.colors.surfaceVariant,
    },
    buttonContainer: {
      flexDirection: 'row',
      marginTop: 8,
    },
    button: {
      marginRight: 8,
      flex: 1,
    },
    testResult: {
      padding: 12,
      borderRadius: 4,
      backgroundColor: theme.colors.surfaceVariant,
    },
    successResult: {
      backgroundColor: theme.colors.successContainer || '#e6f7e6',
    },
    errorResult: {
      backgroundColor: theme.colors.errorContainer,
    },
    testButton: {
      marginVertical: 12,
    },
    testHeader: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
      color: theme.colors.primary,
    },
    capabilitiesContainer: {
      padding: 16,
      marginTop: 12,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 8,
    },
    capabilitiesTitle: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 12,
      color: theme.colors.onSurfaceVariant,
    },
    capabilitiesText: {
      fontFamily: 'monospace',
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
    },
    propertyRow: {
      flexDirection: 'row',
      marginBottom: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    propertyName: {
      fontWeight: 'bold',
      width: 140,
      color: theme.colors.primary,
    },
    propertyValue: {
      flex: 1,
      textAlign: 'right',
    },
    propertyNote: {
      fontStyle: 'italic',
      fontSize: 12,
      marginTop: 8,
      color: theme.colors.outline,
    },
    platformInfo: {
      marginBottom: 12,
    },
    platformInfoText: {
      fontFamily: 'monospace',
      fontSize: 14,
    },
    infoSection: {
      marginVertical: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
    },
    errorContainer: {
      marginTop: 12,
      padding: 12,
      backgroundColor: theme.colors.errorContainer,
      borderRadius: 8,
    },
    actionsContainer: {
      marginTop: 12,
      flexDirection: Platform.OS === 'web' ? 'row' : 'column',
      gap: 10,
    },
    actionButton: {
      ...(Platform.OS === 'web' 
        ? { flex: 1 } 
        : { marginBottom: 8 }
      ),
    },
  });

  const isButtonDisabled = testStatus === 'running' || !selectedDeviceId;

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineSmall">Audio Device Test</Text>
      <Text variant="bodyMedium" style={styles.description}>
        This test verifies audio device detection and selection on {Platform.OS}.
      </Text>

      {platformInfo && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.platformInfo}>System Information</Text>
            {platformInfo.split('\n').map((line, index) => (
              <Text key={index} style={styles.platformInfoText}>{line}</Text>
            ))}
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Device Selection</Text>
          <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
            Select a device to use for audio recording:
          </Text>
          <AudioDeviceSelector
            value={selectedDeviceId}
            onDeviceSelected={handleDeviceSelected}
            showCapabilities={true}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Device Information</Text>
          
          <View style={styles.infoSection}>
            <View style={styles.propertyRow}>
              <Text style={styles.propertyName}>Detected Devices:</Text>
              <Text style={styles.propertyValue}>{devices.length}</Text>
            </View>
            
            <View style={styles.propertyRow}>
              <Text style={styles.propertyName}>Current Device:</Text>
              <Text style={styles.propertyValue}>
                {currentDevice ? currentDevice.name : 'None'}
                {currentDevice?.isDefault && ' (Default)'}
              </Text>
            </View>
          </View>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={{ color: theme.colors.error }}>
                Error: {error.toString()}
              </Text>
            </View>
          )}
          
          {selectedDeviceCapabilities.length > 0 && (
            <View style={styles.capabilitiesContainer}>
              <Text style={styles.capabilitiesTitle}>Selected Device Capabilities</Text>
              
              {selectedDeviceCapabilities.map((item, index) => (
                <View key={index} style={styles.propertyRow}>
                  <Text style={[styles.capabilitiesText, styles.propertyName]}>
                    {item.property}:
                  </Text>
                  <Text style={[styles.capabilitiesText, styles.propertyValue]}>
                    {item.value}
                  </Text>
                </View>
              ))}
              
              <Divider style={{ marginVertical: 12 }} />
              
              <Text style={styles.propertyNote}>
                {Platform.OS === 'web' ? webAudioInfo : nativeAudioInfo}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={[styles.card, styles.testCard]}>
        <Card.Content>
          <Text style={styles.testHeader}>🎤 Test Device Access</Text>
          <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
            Click the button below to verify microphone access with the selected device.
          </Text>
          
          <Button
            mode="contained"
            onPress={runDeviceTest}
            loading={testStatus === 'running'}
            disabled={isButtonDisabled}
            style={styles.testButton}
            icon="microphone"
          >
            Run Access Test
          </Button>
          
          {testResult && (
            <View style={[
              styles.testResult, 
              testStatus === 'success' ? styles.successResult : 
              testStatus === 'error' ? styles.errorResult : {}
            ]}>
              <Text variant="bodyMedium">{testResult}</Text>
              {testStatus !== 'running' && (
                <Button 
                  mode="outlined" 
                  onPress={resetTest} 
                  style={{ marginTop: 12 }}
                >
                  Reset Test
                </Button>
              )}
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Debug Actions</Text>
          <View style={styles.actionsContainer}>
            <Button
              mode="outlined"
              onPress={() => refreshDevices()}
              style={styles.actionButton}
              icon="refresh"
            >
              Refresh
            </Button>
            <Button
              mode="outlined"
              onPress={() => resetToDefaultDevice()}
              style={styles.actionButton}
              icon="restore"
            >
              Default
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
} 