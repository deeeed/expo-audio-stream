import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme, AppTheme } from '@siteed/design-system';
import { 
  AudioDevice, 
  RecordingConfig, 
  SampleRate,
  DeviceDisconnectionBehaviorType
} from '@siteed/expo-audio-studio';
import { IconButton } from 'react-native-paper';

const getStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    borderRadius: 8,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.errorContainer,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    margin: 0,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  fixButton: {
    margin: 0,
  },
  warningText: {
    color: theme.colors.onErrorContainer, 
    fontWeight: 'bold'
  },
  bodyText: {
    color: theme.colors.onErrorContainer
  }
});

// Common sample rates that work on most devices
const COMMON_SAMPLE_RATES = [16000, 44100, 48000];

// Common channel configurations that work on most devices
const COMMON_CHANNEL_COUNTS = [1, 2];

interface DeviceValidationManagerProps {
  device: AudioDevice | null;
  recordingConfig: RecordingConfig;
  sampleRateForTranscription?: number;
  enableLiveTranscription?: boolean;
  onUpdateConfig?: (updates: Partial<RecordingConfig>) => void;
}

export function DeviceValidationManager({
  device,
  recordingConfig,
  sampleRateForTranscription,
  enableLiveTranscription = false,
  onUpdateConfig,
}: DeviceValidationManagerProps) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  
  // Check if device supports the current sample rate
  const sampleRateSupported = useMemo(() => {
    // If no device is selected or no capabilities reported, assume it's supported
    if (!device || !device.capabilities || !device.capabilities.sampleRates) return true;
    
    // Check if the current sample rate is in device capabilities
    const deviceSupported = device.capabilities.sampleRates.includes(recordingConfig.sampleRate || 44100);
    
    // Even if not explicitly reported, common sample rates usually work
    const isCommonRate = COMMON_SAMPLE_RATES.includes(recordingConfig.sampleRate || 44100);
    
    return deviceSupported || isCommonRate;
  }, [device, recordingConfig.sampleRate]);
  
  // Check if device supports the current channel count
  const channelCountSupported = useMemo(() => {
    // If no device is selected or no capabilities reported, assume it's supported
    if (!device || !device.capabilities || !device.capabilities.channelCounts) return true;
    
    // Check if the current channel count is in device capabilities
    const deviceSupported = device.capabilities.channelCounts.includes(recordingConfig.channels || 1);
    
    // Even if not explicitly reported, common channel counts usually work
    const isCommonChannel = COMMON_CHANNEL_COUNTS.includes(recordingConfig.channels || 1);
    
    return deviceSupported || isCommonChannel;
  }, [device, recordingConfig.channels]);
  
  // Check if sample rate is optimal for transcription
  const isOptimalForTranscription = useMemo(() => {
    if (!enableLiveTranscription || !sampleRateForTranscription) return true;
    
    // If the current sample rate matches the transcription rate, it's optimal
    if (recordingConfig.sampleRate === sampleRateForTranscription) return true;
    
    // If transcription is enabled but we're not using the optimal rate,
    // still consider it OK if the device doesn't support the optimal rate
    if (device?.capabilities?.sampleRates && 
        !device.capabilities.sampleRates.includes(sampleRateForTranscription)) {
      return true;
    }
    
    return false;
  }, [enableLiveTranscription, recordingConfig.sampleRate, sampleRateForTranscription, device]);
  
  // Fix configuration automatically
  const fixConfiguration = useCallback(() => {
    if (!device || !onUpdateConfig) return;
    
    const updates: Partial<RecordingConfig> = {};
    
    // Fix sample rate if not supported
    if (!sampleRateSupported && device.capabilities.sampleRates?.length) {
      // Find closest supported sample rate
      const desired = recordingConfig.sampleRate || 44100;
      const closest = device.capabilities.sampleRates.reduce((prev, curr) => 
        Math.abs(curr - desired) < Math.abs(prev - desired) ? curr : prev
      );
      
      // Convert to SampleRate type
      const validSampleRate: SampleRate = 
        (closest === 16000 || closest === 44100 || closest === 48000) 
          ? closest 
          : 44100;
      
      updates.sampleRate = validSampleRate;
    }
    
    // Fix channel count if not supported
    if (!channelCountSupported && device.capabilities.channelCounts?.length) {
      // Prefer mono (1 channel) if available
      if (device.capabilities.channelCounts.includes(1)) {
        updates.channels = 1;
      } else if (device.capabilities.channelCounts.includes(2)) {
        updates.channels = 2;
      }
    }
    
    // Fix transcription sample rate if needed
    if (!isOptimalForTranscription && sampleRateForTranscription) {
      // Only set if it's one of the valid sample rates
      if (sampleRateForTranscription === 16000 || 
          sampleRateForTranscription === 44100 || 
          sampleRateForTranscription === 48000) {
        if (device.capabilities.sampleRates?.includes(sampleRateForTranscription)) {
          updates.sampleRate = sampleRateForTranscription as SampleRate;
        }
      }
    }
    
    // Set disconnection behavior
    if (!recordingConfig.deviceDisconnectionBehavior) {
      updates.deviceDisconnectionBehavior = 'fallback' as DeviceDisconnectionBehaviorType;
    }
    
    onUpdateConfig(updates);
  }, [device, onUpdateConfig, sampleRateSupported, channelCountSupported, isOptimalForTranscription, recordingConfig.sampleRate, recordingConfig.deviceDisconnectionBehavior, sampleRateForTranscription]);
  
  // If everything is fine, return null
  if (sampleRateSupported && channelCountSupported && isOptimalForTranscription) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <IconButton
          icon="alert-circle"
          iconColor={theme.colors.error}
          size={24}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text variant="labelLarge" style={styles.warningText}>
            Device Configuration Warning
          </Text>
          
          {!sampleRateSupported && (
            <Text variant="bodyMedium" style={styles.bodyText}>
              • Selected device doesn&apos;t support {recordingConfig.sampleRate}Hz sample rate
            </Text>
          )}
          
          {!channelCountSupported && (
            <Text variant="bodyMedium" style={styles.bodyText}>
              • Selected device doesn&apos;t support {recordingConfig.channels} channel{recordingConfig.channels !== 1 ? 's' : ''}
            </Text>
          )}
          
          {!isOptimalForTranscription && (
            <Text variant="bodyMedium" style={styles.bodyText}>
              • Current sample rate ({recordingConfig.sampleRate}Hz) isn&apos;t optimal for transcription
            </Text>
          )}
        </View>
      </View>
      
      <IconButton
        icon="wrench"
        mode="contained"
        iconColor={theme.colors.onError}
        containerColor={theme.colors.error}
        size={20}
        onPress={fixConfiguration}
        style={styles.fixButton}
      />
    </View>
  );
} 