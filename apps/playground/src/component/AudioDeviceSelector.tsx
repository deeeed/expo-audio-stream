import { Text, useTheme, AppTheme } from '@siteed/design-system';
import { AudioDevice, useAudioDevices } from '@siteed/expo-audio-studio';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Platform, StyleSheet, View, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { ActivityIndicator, Card, IconButton, Button } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

// Define a fallback device for web
const DEFAULT_DEVICE: AudioDevice = {
  id: 'default',
  name: 'Default Microphone',
  type: 'builtin_mic',
  isDefault: true,
  isAvailable: true,
  capabilities: {
    sampleRates: [16000, 44100, 48000],
    channelCounts: [1, 2],
    bitDepths: [16, 32],
  },
};

const getIconForDeviceType = (type: string): string => {
  switch (type) {
    case 'bluetooth':
      return 'bluetooth-audio';
    case 'usb':
      return 'usb';
    case 'wired_headset':
    case 'wired_headphones':
      return 'headset';
    case 'speaker':
      return 'speaker';
    case 'builtin_mic':
    default:
      return 'microphone';
  }
};

const getStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  headerText: {
    flex: 1,
    flexShrink: 1,
  },
  deviceName: {
    flexShrink: 1,
  },
  errorText: {
    color: theme.colors.error,
    padding: 8,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.outlineVariant,
  },
  deviceItemSelected: {
    backgroundColor: theme.colors.primaryContainer,
  },
  deviceItemIcon: {
    marginRight: 12,
  },
  deviceItemText: {
    flex: 1,
  },
  deviceItemCheck: {
    width: 24,
  },
  deviceInfo: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  deviceInfoItem: {
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 6,
  },
  deviceInfoText: {
    fontSize: 12,
    color: theme.colors.onSecondaryContainer,
  },
  capabilitiesContainer: {
    padding: 16,
    backgroundColor: theme.colors.surfaceVariant,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
    marginTop: 8,
  },
  notSupportedText: {
    fontStyle: 'italic',
    color: theme.colors.outline,
  },
  permissionContainer: {
    padding: 16,
    alignItems: 'center',
  },
  permissionText: {
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  emptyListMessage: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentMeasure: {
    position: 'absolute',
    opacity: 0,
    zIndex: -1,
    pointerEvents: 'none',
  },
});

interface AudioDeviceSelectorProps {
  /**
   * Current selected device ID
   */
  value?: string;
  /**
   * Called when device selection changes
   */
  onDeviceSelected?: (device: AudioDevice) => void;
  /**
   * Whether the component is disabled
   */
  disabled?: boolean;
  /**
   * Whether to show the refresh button
   */
  showRefreshButton?: boolean;
  /**
   * Custom label for the selector
   */
  label?: string;
  /**
   * Whether to show device capabilities
   */
  showCapabilities?: boolean;
  /**
   * Test ID for the component
   */
  testID?: string;
}

/**
 * A component for selecting audio input devices
 */
export function AudioDeviceSelector({
  value,
  onDeviceSelected,
  disabled = false,
  showRefreshButton = true,
  label = 'Audio Input Device',
  showCapabilities = false,
  testID = 'audio-device-selector',
}: AudioDeviceSelectorProps) {
  const {
    devices: hookDevices,
    currentDevice,
    loading: hookLoading,
    error: hookError,
    selectDevice: hookSelectDevice,
    refreshDevices
  } = useAudioDevices();
  
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(value);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const animationHeight = useSharedValue(0);
  const [contentHeight, setContentHeight] = useState(300); // Default fallback height
  const contentMeasured = useRef(false);
  const theme = useTheme();

  const styles = useMemo(() => getStyles(theme), [theme]);
  
  // Update local state when hook data changes
  useEffect(() => {
    setDevices(hookDevices);
    setLoading(hookLoading);
    if (hookError) {
      setError(hookError.message);
    }
  }, [hookDevices, hookLoading, hookError]);

  // Update selected device when currentDevice changes
  useEffect(() => {
    if (currentDevice && !selectedDeviceId) {
      setSelectedDeviceId(currentDevice.id);
    }
  }, [currentDevice, selectedDeviceId]);

  const selectedDevice = useMemo(() => {
    return devices.find(d => d.id === selectedDeviceId) || 
           devices.find(d => d.isDefault) || 
           (devices.length > 0 ? devices[0] : null);
  }, [devices, selectedDeviceId]);

  const handleSelectDevice = useCallback(async (device: AudioDevice) => {
    try {
      setIsExpanded(false);
      animationHeight.value = withTiming(0, { duration: 300 });
      setLoading(true);
      
      // Select the device using the hook
      const success = await hookSelectDevice(device.id);
      
      if (success) {
        setSelectedDeviceId(device.id);
        onDeviceSelected?.(device);
      } else {
        throw new Error(`Failed to select device: ${device.name}`);
      }
    } catch (err) {
      console.error('Error selecting device:', err);
      setError(err instanceof Error ? err.message : 'Failed to select device. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [onDeviceSelected, hookSelectDevice, animationHeight]);

  const handleRefresh = useCallback(() => {
    refreshDevices().catch(err => {
      console.error('Failed to refresh devices:', err);
      setError('Failed to refresh device list');
    });
  }, [refreshDevices]);

  const handleContentLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && (!contentMeasured.current || height !== contentHeight)) {
      setContentHeight(height);
      contentMeasured.current = true;
      
      // If already expanded, update the animation height
      if (isExpanded) {
        animationHeight.value = withTiming(height, { duration: 300 });
      }
    }
  }, [contentHeight, isExpanded, animationHeight]);

  const toggleExpanded = useCallback(() => {
    const newIsExpanded = !isExpanded;
    setIsExpanded(newIsExpanded);
    animationHeight.value = withTiming(
      newIsExpanded ? contentHeight : 0, 
      { duration: 300 }
    );
  }, [isExpanded, animationHeight, contentHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animationHeight.value,
    opacity: animationHeight.value === 0 ? 0 : 1,
    overflow: 'hidden',
  }));

  // Check for permission denied case
  const isPermissionDenied = useMemo(() => {
    return devices.length === 1 && devices[0]?.name === 'Microphone Access Denied';
  }, [devices]);

  // Handle open browser settings
  const handleOpenSettings = useCallback(() => {
    // For Safari, we can guide users to manual settings
    if (Platform.OS === 'web') {
      // We can't open settings directly from the web, just provide guidance
      alert('Please allow microphone access in your browser settings to use this feature.');
    }
  }, []);

  // Render special case for permission denied on web
  if (Platform.OS === 'web' && isPermissionDenied) {
    return (
      <Card testID={testID} style={styles.container}>
        <Card.Content style={styles.permissionContainer}>
          <IconButton 
            icon="microphone-off" 
            size={32} 
            iconColor={theme.colors.error}
          />
          <Text variant="titleMedium" style={{ color: theme.colors.error }}>
            Microphone Access Denied
          </Text>
          <Text variant="bodyMedium" style={styles.permissionText}>
            You need to allow microphone access in your browser settings to use this feature.
          </Text>
          <Button 
            mode="contained" 
            onPress={handleOpenSettings}
            style={styles.permissionButton}
          >
            Open Settings
          </Button>
        </Card.Content>
      </Card>
    );
  }
  
  // Render simplified UI for web with single device
  if (Platform.OS === 'web' && devices.length <= 1) {
    const device = devices[0] || DEFAULT_DEVICE;
    return (
      <Card testID={testID} style={styles.container}>
        <Card.Content>
          <Text variant="labelMedium">{label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <IconButton 
              icon={getIconForDeviceType(device.type)} 
              size={20}
              style={styles.icon}
            />
            <Text variant="bodyMedium">
              {device.name}
            </Text>
          </View>
          <Text style={styles.notSupportedText}>
            {device.name.includes('Browser Managed') 
              ? 'Your browser manages microphone access for privacy reasons. Multiple device selection may not be available.'
              : 'Grant microphone permissions to access audio devices.'}
          </Text>
          {showRefreshButton && (
            <Button 
              mode="outlined" 
              icon="refresh" 
              onPress={handleRefresh} 
              style={{ marginTop: 12 }}
              disabled={disabled || loading}
            >
              Refresh Devices
            </Button>
          )}
        </Card.Content>
      </Card>
    );
  }

  // Add this function right before the return statement of the component
  const renderExpandableContent = () => (
    <>
      {devices.length > 0 ? (
        <View>
          {devices.map((device) => (
            <TouchableOpacity
              key={device.id}
              style={[
                styles.deviceItem,
                device.id === selectedDeviceId ? styles.deviceItemSelected : undefined
              ]}
              onPress={() => handleSelectDevice(device)}
              disabled={disabled || loading}
            >
              <IconButton
                icon={getIconForDeviceType(device.type)}
                size={20}
                style={styles.deviceItemIcon}
              />
              <Text variant="bodyMedium" style={styles.deviceItemText}>
                {device.name}
                {device.isDefault && (
                  <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                    {' '}(Default)
                  </Text>
                )}
              </Text>
              {device.id === selectedDeviceId && (
                <View style={styles.deviceItemCheck}>
                  <IconButton icon="check" size={16} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyListMessage}>
          <Text>No devices found</Text>
        </View>
      )}
      
      {/* Capabilities section with improved layout */}
      {showCapabilities && selectedDevice && (
        <View style={styles.capabilitiesContainer}>
          <Text variant="labelSmall" style={{ marginBottom: 12 }}>Device Capabilities</Text>
          <View style={styles.deviceInfo}>
            <View style={styles.deviceInfoItem}>
              <Text style={styles.deviceInfoText}>Type: {selectedDevice.type}</Text>
            </View>
            
            {selectedDevice.capabilities.sampleRates && selectedDevice.capabilities.sampleRates.length > 0 && (
              <View style={styles.deviceInfoItem}>
                <Text style={styles.deviceInfoText}>
                  Sample rates: {selectedDevice.capabilities.sampleRates.join(', ')} Hz
                </Text>
              </View>
            )}
            
            {selectedDevice.capabilities.channelCounts && selectedDevice.capabilities.channelCounts.length > 0 && (
              <View style={styles.deviceInfoItem}>
                <Text style={styles.deviceInfoText}>
                  Channels: {selectedDevice.capabilities.channelCounts.join(', ')}
                </Text>
              </View>
            )}
            
            {selectedDevice.capabilities.bitDepths && selectedDevice.capabilities.bitDepths.length > 0 && (
              <View style={styles.deviceInfoItem}>
                <Text style={styles.deviceInfoText}>
                  Bit depth: {selectedDevice.capabilities.bitDepths.join(', ')} bit
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </>
  );

  // Standard implementation for native platforms and web with multiple devices
  return (
    <View testID={testID} style={styles.container}>
      {loading ? (
        <ActivityIndicator style={{ margin: 20 }} />
      ) : (
        <>
          {/* Hidden measurement view */}
          <View 
            style={styles.contentMeasure} 
            onLayout={handleContentLayout}
          >
            {renderExpandableContent()}
          </View>

          <TouchableOpacity 
            onPress={toggleExpanded}
            disabled={disabled || loading}
            style={styles.header}
          >
            <View style={styles.titleContainer}>
              <IconButton 
                icon={getIconForDeviceType(selectedDevice?.type || 'builtin_mic')} 
                size={20} 
                style={styles.icon}
              />
              <View style={styles.headerText}>
                <Text variant="labelMedium">{label}</Text>
                <View style={styles.selectedInfo}>
                  <Text variant="bodyMedium" numberOfLines={1} style={styles.deviceName}>
                    {selectedDevice ? selectedDevice.name : 'No device selected'}
                  </Text>
                  {selectedDevice?.isDefault && (
                    <Text variant="labelSmall" style={{ marginLeft: 4, color: theme.colors.primary }}>
                      (Default)
                    </Text>
                  )}
                </View>
              </View>
            </View>
            
            <View style={styles.actionsContainer}>
              {showRefreshButton && (
                <IconButton
                  icon="refresh"
                  size={20}
                  onPress={handleRefresh}
                  disabled={disabled || loading}
                  testID={`${testID}-refresh-button`}
                />
              )}
              
              <IconButton
                icon={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                onPress={toggleExpanded}
                disabled={disabled || loading}
                testID={`${testID}-expand-button`}
              />
            </View>
          </TouchableOpacity>
          
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          <Animated.View style={animatedStyle}>
            {renderExpandableContent()}
          </Animated.View>
        </>
      )}
    </View>
  );
} 