import { Text, useTheme, AppTheme, LabelSwitch } from '@siteed/design-system'
import { DecibelFormat } from '@siteed/expo-audio-ui'
import React, { useCallback, useMemo, useState, useRef } from 'react'
import { StyleSheet, View, TouchableOpacity, LayoutChangeEvent } from 'react-native'
import { IconButton } from 'react-native-paper'
import { SegmentedButtons } from 'react-native-paper'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'

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
  headerText: {
    flex: 1,
    flexShrink: 1,
  },
  settingsContainer: {
    padding: 16,
    backgroundColor: theme.colors.surfaceVariant,
  },
  settingsRow: {
    marginTop: 12,
  },
  firstSettingsRow: {
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: theme.colors.outline,
    marginTop: 4,
  },
  contentMeasure: {
    position: 'absolute',
    opacity: 0,
    zIndex: -1,
  },
})

export interface GaugeSettings {
  inputFormat: DecibelFormat
  outputFormat: DecibelFormat
  showTickMarks: boolean
  showNeedle: boolean
  showValue: boolean
  showUnit: boolean
  dbRange: string
  minDb: number
  maxDb: number
}

interface DecibelGaugeSettingsProps {
  settings: GaugeSettings
  onChange: (settings: Partial<GaugeSettings>) => void
  disabled?: boolean
  testID?: string
}

export function DecibelGaugeSettings({
  settings,
  onChange,
  disabled = false,
  testID = 'decibel-gauge-settings',
}: DecibelGaugeSettingsProps) {
  const theme = useTheme()
  const styles = useMemo(() => getStyles(theme), [theme])
  
  const [isExpanded, setIsExpanded] = useState(false)
  const animationHeight = useSharedValue(0)
  const [contentHeight, setContentHeight] = useState(400) // Default fallback height
  const contentMeasured = useRef(false)

  // Measure the content height
  const handleContentLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout
    if (height > 0 && (!contentMeasured.current || height !== contentHeight)) {
      setContentHeight(height)
      contentMeasured.current = true
      
      // If already expanded, update the animation height
      if (isExpanded) {
        animationHeight.value = withTiming(height, { duration: 300 })
      }
    }
  }, [contentHeight, isExpanded, animationHeight])

  const toggleExpanded = useCallback(() => {
    const newIsExpanded = !isExpanded
    setIsExpanded(newIsExpanded)
    animationHeight.value = withTiming(
      newIsExpanded ? contentHeight : 0, 
      { duration: 300 }
    )
  }, [isExpanded, animationHeight, contentHeight])

  const animatedStyle = useAnimatedStyle(() => ({
    height: animationHeight.value,
    opacity: animationHeight.value === 0 ? 0 : 1,
    overflow: 'hidden',
  }))

  // Render the content twice - once for measurement (hidden) and once for display
  const renderContent = () => (
    <View style={styles.settingsContainer}>
      <View style={styles.firstSettingsRow}>
        <Text variant="titleSmall">Input Format</Text>
        <SegmentedButtons
          value={settings.inputFormat}
          onValueChange={(value) => onChange({ inputFormat: value as DecibelFormat })}
          buttons={[
            { value: 'dBFS', label: 'dBFS' },
            { value: 'dB SPL', label: 'dB SPL' },
            { value: 'dBA', label: 'dBA' },
          ]}
        />
        <Text style={styles.helpText}>
          Format of incoming audio measurements
        </Text>
      </View>
      
      <View style={styles.settingsRow}>
        <Text variant="titleSmall">Output Format</Text>
        <SegmentedButtons
          value={settings.outputFormat}
          onValueChange={(value) => onChange({ outputFormat: value as DecibelFormat })}
          buttons={[
            { value: 'dBFS', label: 'dBFS' },
            { value: 'dB SPL', label: 'dB SPL' },
            { value: 'dBA', label: 'dBA' },
          ]}
        />
        <Text style={styles.helpText}>
          Format to display on the gauge
        </Text>
      </View>
      
      <View style={styles.settingsRow}>
        <Text variant="titleSmall">dB Range</Text>
        <SegmentedButtons
          value={settings.dbRange}
          onValueChange={(value) => {
            const [min, max] = value.split('_').map(Number)
            onChange({ 
              dbRange: value,
              minDb: min,
              maxDb: max 
            })
          }}
          buttons={[
            { value: '-60_0', label: '-60 to 0 dB' },
            { value: '-40_0', label: '-40 to 0 dB' },
            { value: '30_120', label: '30 to 120 dB' },
          ]}
        />
        <Text style={styles.helpText}>
          Min and max values displayed on the gauge
        </Text>
      </View>
      
      <View style={styles.settingsRow}>
        <LabelSwitch
          label="Show Tick Marks"
          value={settings.showTickMarks}
          onValueChange={(value) => onChange({ showTickMarks: value })}
        />
      </View>
      
      <View style={styles.settingsRow}>
        <LabelSwitch
          label="Show Needle"
          value={settings.showNeedle}
          onValueChange={(value) => onChange({ showNeedle: value })}
        />
      </View>
      
      <View style={styles.settingsRow}>
        <LabelSwitch
          label="Show Value"
          value={settings.showValue}
          onValueChange={(value) => onChange({ showValue: value })}
        />
      </View>
      
      <View style={styles.settingsRow}>
        <LabelSwitch
          label="Show Unit"
          value={settings.showUnit}
          onValueChange={(value) => onChange({ showUnit: value })}
          disabled={!settings.showValue}
        />
        <Text style={styles.helpText}>
          Display unit label with value (requires Show Value)
        </Text>
      </View>
    </View>
  )

  return (
    <View testID={testID} style={styles.container}>
      {/* Hidden measurement view */}
      <View 
        style={styles.contentMeasure} 
        onLayout={handleContentLayout}
        pointerEvents="none"
      >
        {renderContent()}
      </View>
    
      <TouchableOpacity 
        onPress={toggleExpanded}
        disabled={disabled}
        style={styles.header}
      >
        <View style={styles.titleContainer}>
          <IconButton 
            icon="gauge" 
            size={20} 
            style={styles.icon}
          />
          <View style={styles.headerText}>
            <Text variant="labelMedium">Gauge Settings</Text>
            <Text variant="bodySmall" numberOfLines={1}>
              Format: {settings.inputFormat} → {settings.outputFormat}, Range: {settings.minDb} to {settings.maxDb} dB
            </Text>
          </View>
        </View>
        
        <IconButton
          icon={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          onPress={toggleExpanded}
          disabled={disabled}
          testID={`${testID}-expand-button`}
        />
      </TouchableOpacity>
      
      <Animated.View style={animatedStyle}>
        {renderContent()}
      </Animated.View>
    </View>
  )
} 