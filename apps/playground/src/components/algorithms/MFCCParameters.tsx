import React from 'react'

import { View, StyleSheet } from 'react-native'
import { Text, TextInput } from 'react-native-paper'

import type { AppTheme } from '@siteed/design-system'
import { useThemePreferences } from '@siteed/design-system'

interface MFCCParametersProps {
  parameters: {
    numberCoefficients: number;
    numberBands: number;
    lowFrequencyBound: number;
    highFrequencyBound: number;
  };
  onParameterChange: (paramName: string, value: number) => void;
}

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    container: {
      marginTop: 16,
    },
    parameterRow: {
      marginBottom: 12,
    },
    parameterLabel: {
      fontSize: 14,
      marginBottom: 4,
    },
    parameterDescription: {
      fontSize: 12,
      color: theme.colors.outline,
      marginBottom: 4,
    },
  })
}

function MFCCParameters({ parameters, onParameterChange }: MFCCParametersProps) {
  const { theme } = useThemePreferences()
  const styles = getStyles({ theme })

  const handleChange = (paramName: string, value: string) => {
    const numValue = Number(value)
    if (!isNaN(numValue)) {
      onParameterChange(paramName, numValue)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.parameterRow}>
        <Text style={styles.parameterLabel}>Number of Coefficients</Text>
        <Text style={styles.parameterDescription}>Number of output MFCC coefficients</Text>
        <TextInput
          mode="outlined"
          value={String(parameters.numberCoefficients)}
          onChangeText={(value) => handleChange('numberCoefficients', value)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.parameterRow}>
        <Text style={styles.parameterLabel}>Number of Bands</Text>
        <Text style={styles.parameterDescription}>Number of mel-bands</Text>
        <TextInput
          mode="outlined"
          value={String(parameters.numberBands)}
          onChangeText={(value) => handleChange('numberBands', value)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.parameterRow}>
        <Text style={styles.parameterLabel}>Low Frequency Bound (Hz)</Text>
        <Text style={styles.parameterDescription}>Lower bound of the frequency range</Text>
        <TextInput
          mode="outlined"
          value={String(parameters.lowFrequencyBound)}
          onChangeText={(value) => handleChange('lowFrequencyBound', value)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.parameterRow}>
        <Text style={styles.parameterLabel}>High Frequency Bound (Hz)</Text>
        <Text style={styles.parameterDescription}>Upper bound of the frequency range</Text>
        <TextInput
          mode="outlined"
          value={String(parameters.highFrequencyBound)}
          onChangeText={(value) => handleChange('highFrequencyBound', value)}
          keyboardType="numeric"
        />
      </View>
    </View>
  )
}

export default MFCCParameters 