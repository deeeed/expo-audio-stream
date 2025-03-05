import { AppTheme, ScreenWrapper, useThemePreferences } from '@siteed/design-system';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import Essentia from 'react-native-essentia';

interface EssentiaInitResult {
  success: boolean;
  error?: string;
}

interface EssentiaVersionResult {
  success: boolean;
  version?: string;
  error?: string;
}

interface ValidationResult {
  success: boolean;
  initialized?: boolean;
  version?: string;
  message?: string;
  error?: string;
}

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    container: {
      padding: theme.padding.s,
      flex: 1,
      gap: theme.spacing.gap || 10,
    },
    resultContainer: {
      marginTop: 20,
      padding: theme.padding.s,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.roundness,
    },
    buttonContainer: {
      marginTop: 20,
      gap: 10,
    },
    successContainer: {
      backgroundColor: theme.colors.tertiaryContainer,
    },
    errorContainer: {
      backgroundColor: theme.colors.errorContainer,
    }
  });
};

function EssentiaScreen() {
  const { theme } = useThemePreferences();
  const styles = useMemo(() => getStyles({ theme }), [theme]);
  
  const [initResult, setInitResult] = useState<EssentiaInitResult | null>(null);
  const [versionResult, setVersionResult] = useState<EssentiaVersionResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const handleInitialize = async () => {
    try {
      const success = await Essentia.initialize();
      setInitResult({ success });
    } catch (error) {
      console.error('Essentia initialization error:', error);
      setInitResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleGetVersion = async () => {
    try {
      const version = await Essentia.getVersion();
      setVersionResult({ success: true, version });
    } catch (error) {
      console.error('Essentia get version error:', error);
      setVersionResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const validateEssentiaIntegration = async () => {
    try {
      // Step 1: Test initialization
      let initialized = false;
      try {
        initialized = await Essentia.initialize();
      } catch (error) {
        throw new Error(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Step 2: Test version retrieval
      let version = '';
      try {
        version = await Essentia.getVersion();
      } catch (error) {
        throw new Error(`Version retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      setValidationResult({
        success: true,
        initialized,
        version,
        message: 'Essentia JNI integration is working correctly'
      });
    } catch (error) {
      console.error('Essentia validation error:', error);
      setValidationResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <ScreenWrapper withScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineMedium">Essentia JNI Integration</Text>
      
      <View style={styles.buttonContainer}>
        <Button mode="contained" onPress={handleInitialize}>
          Initialize Essentia
        </Button>
        <Button mode="contained" onPress={handleGetVersion}>
          Get Essentia Version
        </Button>
        <Button 
          mode="contained" 
          onPress={validateEssentiaIntegration}
          style={{ backgroundColor: theme.colors.tertiary }}
        >
          Validate Essentia Integration
        </Button>
      </View>

      {initResult && (
        <View style={[
          styles.resultContainer,
          initResult.success ? styles.successContainer : styles.errorContainer
        ]}>
          <Text variant="titleMedium">Initialization Result:</Text>
          <Text>Success: {initResult.success ? 'Yes' : 'No'}</Text>
          {initResult.error && (
            <Text style={{ color: theme.colors.error }}>
              Error: {initResult.error}
            </Text>
          )}
        </View>
      )}

      {versionResult && (
        <View style={[
          styles.resultContainer,
          versionResult.success ? styles.successContainer : styles.errorContainer
        ]}>
          <Text variant="titleMedium">Version Result:</Text>
          <Text>Success: {versionResult.success ? 'Yes' : 'No'}</Text>
          {versionResult.version && (
            <Text>Essentia Version: {versionResult.version}</Text>
          )}
          {versionResult.error && (
            <Text style={{ color: theme.colors.error }}>
              Error: {versionResult.error}
            </Text>
          )}
        </View>
      )}

      {validationResult && (
        <View style={[
          styles.resultContainer,
          validationResult.success ? styles.successContainer : styles.errorContainer
        ]}>
          <Text variant="titleMedium">Integration Validation:</Text>
          <Text>Success: {validationResult.success ? 'Yes' : 'No'}</Text>
          {validationResult.initialized !== undefined && (
            <Text>Essentia Initialized: {validationResult.initialized ? 'Yes' : 'No'}</Text>
          )}
          {validationResult.version && (
            <Text>Essentia Version: {validationResult.version}</Text>
          )}
          {validationResult.message && (
            <Text>Message: {validationResult.message}</Text>
          )}
          {validationResult.error && (
            <Text style={{ color: theme.colors.error }}>
              Error: {validationResult.error}
            </Text>
          )}
        </View>
      )}
    </ScreenWrapper>
  );
}

export default EssentiaScreen;
