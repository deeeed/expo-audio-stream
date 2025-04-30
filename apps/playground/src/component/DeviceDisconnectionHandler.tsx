import React, { useEffect, useState, useRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme, AppTheme } from '@siteed/design-system';
import { 
  AudioDevice, 
  DeviceDisconnectionBehaviorType, 
  useAudioDevices 
} from '@siteed/expo-audio-studio';
import { ActivityIndicator } from 'react-native-paper';
import { baseLogger } from '../config';

const logger = baseLogger.extend('DeviceDisconnectionHandler');

const getStyles = (_theme: AppTheme) => StyleSheet.create({
  container: {
    borderRadius: 8,
    marginVertical: 8,
    padding: 12,
  },
  content: {
    alignItems: 'center',
  },
  fallbackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginRight: 8,
  }
});

interface DeviceDisconnectionHandlerProps {
  isRecording: boolean;
  currentDevice: AudioDevice | null;
  deviceDisconnectionBehavior?: DeviceDisconnectionBehaviorType;
  onDeviceDisconnected?: () => void;
  onDeviceFallback?: (newDevice: AudioDevice) => void;
}

export function DeviceDisconnectionHandler({
  isRecording,
  currentDevice,
  deviceDisconnectionBehavior = 'pause',
  onDeviceDisconnected,
  onDeviceFallback,
}: DeviceDisconnectionHandlerProps) {
  const theme = useTheme();
  const { devices } = useAudioDevices();
  const [showWarning, setShowWarning] = useState(false);
  const [fallbackInProgress, setFallbackInProgress] = useState(false);
  const styles = useMemo(() => getStyles(theme), [theme]);
  
  // Store callback references to avoid dependency changes in useEffect
  const onDeviceDisconnectedRef = useRef(onDeviceDisconnected);
  const onDeviceFallbackRef = useRef(onDeviceFallback);
  const deviceDisconnectionBehaviorRef = useRef(deviceDisconnectionBehavior);
  
  // Update refs when props change
  useEffect(() => {
    onDeviceDisconnectedRef.current = onDeviceDisconnected;
    onDeviceFallbackRef.current = onDeviceFallback;
    deviceDisconnectionBehaviorRef.current = deviceDisconnectionBehavior;
  }, [onDeviceDisconnected, onDeviceFallback, deviceDisconnectionBehavior]);
  
  // Add more robust protection against false device disconnections
  const [checkEnabled, setCheckEnabled] = useState(false);
  const disconnectionCounter = useRef(0);
  const lastDeviceId = useRef<string | null>(null);
  const devicesRef = useRef(devices);
  
  // Update devices ref when devices change
  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);
  
  // Only enable device checking after a significant delay to avoid false positives
  useEffect(() => {
    if (isRecording && currentDevice) {
      // Store the current device ID for consistency checking
      lastDeviceId.current = currentDevice.id;
      
      // Reset the disconnection counter whenever recording starts or device changes
      disconnectionCounter.current = 0;
      
      // Set a longer delay before enabling checks (5 seconds)
      const timer = setTimeout(() => {
        logger.debug('Enabling device disconnection detection');
        setCheckEnabled(true);
      }, 5000);
      
      return () => {
        clearTimeout(timer);
        setCheckEnabled(false);
      };
    } else {
      // Reset when not recording
      setCheckEnabled(false);
      setShowWarning(false);
      disconnectionCounter.current = 0;
    }
  }, [isRecording, currentDevice]);

  // Split the device check into a separate effect to avoid infinite loops
  useEffect(() => {
    // Don't run the check unless we're actively recording and checks are enabled
    if (!isRecording || !currentDevice || !checkEnabled) {
      return;
    }
    
    // Only run this check if the device ID hasn't changed
    if (lastDeviceId.current !== currentDevice.id) {
      logger.debug('Device ID changed, skipping disconnection check');
      lastDeviceId.current = currentDevice.id;
      disconnectionCounter.current = 0;
      return;
    }

    const deviceExists = devicesRef.current.some(d => d.id === currentDevice.id);
    
    if (!deviceExists) {
      // Increment the counter when a potential disconnection is detected
      disconnectionCounter.current += 1;
      logger.debug(`Device disconnection detected (count: ${disconnectionCounter.current})`);
      
      // Only act on disconnection after multiple consecutive detections (3 or more)
      if (disconnectionCounter.current >= 3) {
        logger.warn(`Device ${currentDevice.name} (${currentDevice.id}) disconnected (confirmed)`);
        
        handleDeviceDisconnection();
      }
    } else {
      // Reset counter when device is detected
      if (disconnectionCounter.current > 0) {
        logger.debug('Device reconnected, resetting counter');
        disconnectionCounter.current = 0;
      }
      setShowWarning(false);
    }
  }, [isRecording, currentDevice, checkEnabled]);
  
  // Handle device disconnection in a separate function to avoid callback issues
  const handleDeviceDisconnection = () => {
    const currentBehavior = deviceDisconnectionBehaviorRef.current;
    
    if (currentBehavior === 'pause') {
      setShowWarning(true);
      if (onDeviceDisconnectedRef.current) {
        onDeviceDisconnectedRef.current();
      }
    } else if (currentBehavior === 'fallback') {
      setFallbackInProgress(true);
      // Find default device or first available device
      const currentDevices = devicesRef.current;
      const fallbackDevice = currentDevices.find(d => d.isDefault) || 
                            (currentDevices.length > 0 ? currentDevices[0] : null);
      
      if (fallbackDevice) {
        // Use timeout to give UI time to update
        setTimeout(() => {
          logger.debug(`Switching to fallback device: ${fallbackDevice.name} (${fallbackDevice.id})`);
          if (onDeviceFallbackRef.current) {
            onDeviceFallbackRef.current(fallbackDevice);
          }
          setFallbackInProgress(false);
          setShowWarning(true);
        }, 300);
      } else {
        // No fallback available, just pause
        logger.warn('No fallback device available, pausing recording');
        if (onDeviceDisconnectedRef.current) {
          onDeviceDisconnectedRef.current();
        }
        setFallbackInProgress(false);
        setShowWarning(true);
      }
    }
  };

  if (!showWarning && !fallbackInProgress) {
    return null;
  }

  return (
    <View style={[
      styles.container, 
      { backgroundColor: fallbackInProgress ? theme.colors.primaryContainer : theme.colors.errorContainer }
    ]}>
      {fallbackInProgress ? (
        <View style={styles.fallbackContent}>
          <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
            Audio device disconnected. Switching to fallback device...
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onErrorContainer, fontWeight: 'bold' }}>
            Audio Device Disconnected
          </Text>
          
          <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
            {deviceDisconnectionBehaviorRef.current === 'fallback' 
              ? 'Recording continues using default device'
              : 'Recording paused due to device disconnection'}
          </Text>
        </View>
      )}
    </View>
  );
} 