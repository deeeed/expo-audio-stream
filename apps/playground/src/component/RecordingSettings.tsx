import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Text, useTheme, LabelSwitch, EditableInfoCard, AppTheme } from '@siteed/design-system';
import { 
  RecordingConfig, 
  SampleRate, 
  AudioDevice,
  NotificationConfig,
  DeviceDisconnectionBehaviorType,
} from '@siteed/expo-audio-studio';
import { SegmentedButtons } from 'react-native-paper';

import { AudioDeviceSelector } from './AudioDeviceSelector';
import { SegmentDuration, SegmentDurationSelector } from './SegmentDurationSelector';
import { NativeNotificationConfig } from './NativeNotificationConfig';
import { IOSSettingsConfig } from './IOSSettingsConfig';
import { DeviceValidationManager } from './DeviceValidationManager';
import { isWeb } from '../utils/utils';

// Import WhisperSampleRate from config
import { WhisperSampleRate } from '../config';

const DEFAULT_BITRATE = Platform.OS === 'ios' ? 32000 : 24000;

const getStyles = (_theme: AppTheme) => StyleSheet.create({
  container: {
    gap: 16,
  },
});

interface RecordingSettingsProps {
  config: RecordingConfig;
  onConfigChange: (config: RecordingConfig) => void;
  customFileName: string;
  onCustomFileNameChange: (name: string) => void;
  isRecording: boolean;
  isPaused: boolean;
  isRecordingPrepared?: boolean; // Make optional
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  enableLiveTranscription: boolean;
  // Add state for visualization display
  showVisualization: boolean;
  onShowVisualizationChange: (show: boolean) => void;
}

export function RecordingSettings({
  config,
  onConfigChange,
  customFileName,
  onCustomFileNameChange,
  isRecording,
  isPaused,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  enableLiveTranscription,
  // Add props for visualization display
  showVisualization,
  onShowVisualizationChange,
}: RecordingSettingsProps) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  
  const [notificationEnabled, setNotificationEnabled] = useState(
    config.showNotification ?? true
  );
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>(
    config.notification || {
      title: 'Recording in progress',
      text: '',
      android: {
        notificationId: 1,
        channelId: 'audio_recording_channel',
        channelName: 'Audio Recording',
        channelDescription: 'Shows audio recording status',
      }
    }
  );
  const [iosSettingsEnabled, setIOSSettingsEnabled] = useState(false);
  const [iosSettings, setIOSSettings] = useState<RecordingConfig['ios']>(
    config.ios
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentDevice, setCurrentDevice] = useState<AudioDevice | null>(null);

  // Handle device selection
  const handleDeviceSelected = (device: AudioDevice) => {
    setCurrentDevice(device);
    const updatedConfig = {
      ...config,
      deviceId: device.id,
    };
    onConfigChange(updatedConfig);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleConfigUpdate = (updates: Partial<RecordingConfig>) => {
    const updatedConfig = {
      ...config,
      ...updates,
    };
    onConfigChange(updatedConfig);
  };

  const isDisabled = isRecording || isPaused;

  return (
    <View style={styles.container}>
      <EditableInfoCard
        testID="filename-input"
        label="File Name"
        value={customFileName}
        placeholder="pick a filename for your recording"
        inlineEditable
        editable={!isDisabled}
        containerStyle={{
          backgroundColor: theme.colors.secondaryContainer,
        }}
        onInlineEdit={(newFileName) => {
          if (typeof newFileName === 'string') {
            onCustomFileNameChange(newFileName);
          }
        }}
      />

      <AudioDeviceSelector
        testID="audio-device-selector"
        showCapabilities={true}
        disabled={isDisabled}
        onDeviceSelected={handleDeviceSelected}
      />

      {currentDevice && (
        <DeviceValidationManager
          device={currentDevice}
          recordingConfig={config}
          sampleRateForTranscription={WhisperSampleRate}
          enableLiveTranscription={enableLiveTranscription}
          onUpdateConfig={handleConfigUpdate}
        />
      )}

      <View>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>Sample Rate</Text>
        <SegmentedButtons
          value={String(config.sampleRate || WhisperSampleRate)}
          onValueChange={(value) => {
            const updatedConfig = {
              ...config,
              sampleRate: parseInt(value, 10) as SampleRate,
            };
            onConfigChange(updatedConfig);
          }}
          buttons={[
            { value: '16000', label: '16 kHz' },
            { value: '44100', label: '44.1 kHz' },
            { value: '48000', label: '48 kHz' },
          ]}
        />
      </View>
      
      <View style={{ 
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: 8,
        padding: 12,
        marginVertical: 8
      }}>
        <Text variant="titleMedium" style={{ marginBottom: 12 }}>Compression Settings</Text>
        
        <LabelSwitch
          label="Enable Compression"
          value={config.compression?.enabled ?? true}
          onValueChange={(enabled) => {
            const updatedConfig = {
              ...config,
              compression: {
                ...(config.compression ?? { format: 'opus', bitrate: DEFAULT_BITRATE }),
                enabled,
              },
            };
            onConfigChange(updatedConfig);
          }}
          disabled={isDisabled}
        />

        {config.compression?.enabled && (
          <View style={{ marginLeft: 12, marginTop: 8 }}>
            <View>
              <Text variant="titleSmall" style={{ marginBottom: 8 }}>Format</Text>
              {Platform.OS === 'ios' ? (
                <>
                  <Text>AAC</Text>
                  <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.outline }}>
                    Only AAC format is supported on iOS devices.
                  </Text>
                </>
              ) : (
                <SegmentedButtons
                  value={config.compression?.format || 'opus'}
                  onValueChange={(value) => {
                    const updatedConfig = {
                      ...config,
                      compression: {
                        ...(config.compression ?? { enabled: true, bitrate: DEFAULT_BITRATE }),
                        format: value as 'aac' | 'opus',
                      },
                    };
                    onConfigChange(updatedConfig);
                  }}
                  buttons={[
                    { value: 'opus', label: 'OPUS' },
                    ...(!isWeb ? [{ value: 'aac', label: 'AAC' }] : []),
                  ]}
                />
              )}
            </View>
            
            <View style={{ marginTop: 12 }}>
              <Text variant="titleSmall" style={{ marginBottom: 8 }}>Bitrate</Text>
              <SegmentedButtons
                value={String(config.compression?.bitrate || DEFAULT_BITRATE)}
                onValueChange={(value) => {
                  const updatedConfig = {
                    ...config,
                    compression: {
                      ...(config.compression ?? { enabled: true, format: Platform.OS === 'ios' ? 'aac' : 'opus' }),
                      bitrate: parseInt(value, 10),
                    },
                  };
                  onConfigChange(updatedConfig);
                }}
                buttons={[
                  { value: '32000', label: '32 kbps (Voice)' },
                  { value: '64000', label: '64 kbps (Studio)' },
                ]}
              />
            </View>
            
            <Text variant="bodySmall" style={{ marginTop: 12, color: theme.colors.outline }}>
              Compression reduces file size but may affect audio quality. Higher bitrates preserve more detail.
            </Text>
          </View>
        )}
      </View>
      
      <SegmentDurationSelector
        testID="segment-duration-selector"
        value={(config.segmentDurationMs ?? 100) as SegmentDuration}
        onChange={(duration) => {
          const updatedConfig = {
            ...config,
            segmentDurationMs: duration,
          };
          onConfigChange(updatedConfig);
        }}
        maxDurationMs={1000}
        skipConfirmation
      />
      
      <LabelSwitch
        label="Keep Recording in Background"
        value={config.keepAwake ?? true}
        onValueChange={(enabled) => {
          const updatedConfig = {
            ...config,
            keepAwake: enabled,
          };
          onConfigChange(updatedConfig);
        }}
        disabled={isDisabled}
      />
      
      {/* Web-specific option to control uncompressed audio storage */}
      {isWeb && (
        <View>
          <LabelSwitch
            label="Store Uncompressed Audio (Web only)"
            value={config.web?.storeUncompressedAudio !== false} // Default to true unless explicitly false
            onValueChange={(enabled) => {
              const updatedConfig = {
                ...config,
                web: {
                  ...(config.web || {}),
                  storeUncompressedAudio: enabled,
                },
              };
              onConfigChange(updatedConfig);
            }}
            disabled={isDisabled}
          />
          <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.outline }}>
            {config.web?.storeUncompressedAudio !== false
              ? "Stores uncompressed audio data in memory for direct access. Turn off for long recordings to save memory."
              : "Memory-efficient mode. Only compressed audio will be accessible when recording stops."}
          </Text>
          <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.primary }}>
            Note: Native platforms (iOS/Android) always store to files, not memory.
          </Text>
        </View>
      )}
      
      {Platform.OS !== 'web' && (
        <NativeNotificationConfig
          enabled={notificationEnabled}
          onEnabledChange={(enabled) => {
            setNotificationEnabled(enabled);
            onConfigChange({ ...config, showNotification: enabled });
          }}
          config={notificationConfig}
          onConfigChange={(newNotificationConfig) => {
            setNotificationConfig(newNotificationConfig);
            onConfigChange({ ...config, notification: newNotificationConfig });
          }}
        />
      )}
      
      {Platform.OS === 'ios' && (
        <>
          <LabelSwitch
            label="Custom iOS Audio Settings"
            value={iosSettingsEnabled}
            onValueChange={setIOSSettingsEnabled}
            disabled={isDisabled}
          />
          {iosSettingsEnabled && (
            <IOSSettingsConfig
              config={iosSettings}
              onConfigChange={(newConfig) => {
                setIOSSettings(newConfig);
                onConfigChange({ ...config, ios: newConfig });
              }}
            />
          )}
        </>
      )}

      <View>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>Device Disconnection Behavior</Text>
        <SegmentedButtons
          value={config.deviceDisconnectionBehavior || 'fallback'}
          onValueChange={(value) => {
            const updatedConfig = {
              ...config,
              deviceDisconnectionBehavior: value as DeviceDisconnectionBehaviorType,
            };
            onConfigChange(updatedConfig);
          }}
          buttons={[
            { value: 'fallback', label: 'Fallback to Default', disabled: isDisabled },
            { value: 'pause', label: 'Pause Recording', disabled: isDisabled },
          ]}
        />
      </View>

      {/* Switch for enabling/disabling audio processing (data generation) */}
      <LabelSwitch
        label="Enable Audio Processing"
        value={config.enableProcessing ?? false} // Default to false if undefined
        onValueChange={(enabled) => {
          const updatedConfig = {
            ...config,
            enableProcessing: enabled,
          };
          onConfigChange(updatedConfig);
        }}
        disabled={isDisabled}
      />

      {/* Switch for showing/hiding the visualization UI */}
      <LabelSwitch
        label="Show Visualization"
        value={showVisualization}
        onValueChange={onShowVisualizationChange}
        disabled={isDisabled || !(config.enableProcessing ?? false)} // Disable if recording/paused, or if processing is off
      />
    </View>
  );
} 