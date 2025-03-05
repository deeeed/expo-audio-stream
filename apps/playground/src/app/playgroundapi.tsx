import { AppTheme, ScreenWrapper, useThemePreferences } from '@siteed/design-system';
import PlaygroundAPIModule from 'playgroundapi';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useSampleAudio } from '../hooks/useSampleAudio';

interface ValidationResult {
  success: boolean;
  audioProcessorInitialized?: boolean;
  audioProcessorClass?: string;
  message?: string;
  error?: string;
  errorType?: string;
}

interface AudioProcessingResult {
  success: boolean;
  message?: string;
  error?: string;
  moduleAvailable?: boolean;
  durationMs?: number;
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
        loadingContainer: {
            marginTop: 20,
            padding: theme.padding.s,
            backgroundColor: theme.colors.secondaryContainer,
            borderRadius: theme.roundness,
        }
    });
};

// Sample audio file to use for testing
const sampleAudioAsset = require('@assets/jfk.mp3');

const PlaygroundAPIScreen = () => {
    const { theme } = useThemePreferences();
    const styles = useMemo(() => getStyles({ theme }), [theme]);
    const [result, setResult] = useState<string | null>(null);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [audioProcessingResult, setAudioProcessingResult] = useState<AudioProcessingResult | null>(null);
    
    // Use the sample audio hook
    const { isLoading: isSampleLoading, sampleFile, loadSampleAudio } = useSampleAudio({
        onError: (error) => {
            console.error('Failed to load sample audio:', error);
        }
    });
    
    const handleHello = async () => { 
        try {
            const result = PlaygroundAPIModule.hello();
            console.log(result);
            setResult(result);
        } catch (error) {
            console.error(error);
            setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const handleValidateIntegration = async () => {
        try {
            const result = await PlaygroundAPIModule.validateAudioProcessorIntegration();
            console.log('Validation result:', result);
            setValidationResult(result);
        } catch (error) {
            console.error('Validation error:', error);
            setValidationResult({
                success: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    };

    const handleLoadSampleAndProcess = async () => {
        try {
            // First load the sample audio
            const loadedSample = await loadSampleAudio(sampleAudioAsset, 'jfk.mp3');
            
            if (!loadedSample) {
                throw new Error('Failed to load sample audio file');
            }
            
            console.log('Using sample audio file:', loadedSample.name, 'at path:', loadedSample.uri);
            
            // Then process it with the module
            const processingResult = await PlaygroundAPIModule.processAudioWithModule(loadedSample.uri);
            console.log('Processing result:', processingResult);
            
            setAudioProcessingResult({
                success: true,
                moduleAvailable: processingResult.moduleAvailable,
                durationMs: processingResult.durationMs,
                message: `Successfully processed audio with PlaygroundAPI module. Duration: ${processingResult.durationMs}ms`,
            });
        } catch (error) {
            console.error('Audio processing error:', error);
            setAudioProcessingResult({
                success: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    };

    return (
        <ScreenWrapper withScrollView contentContainerStyle={styles.container}>
            <Text variant="headlineMedium">Playground API</Text>
            
            <View style={styles.buttonContainer}>
                <Button mode="contained" onPress={handleHello}>Test Hello Function</Button>
                <Button mode="contained" onPress={handleValidateIntegration}>
                    Validate AudioProcessor Integration
                </Button>
                <Button 
                    mode="contained" 
                    onPress={handleLoadSampleAndProcess}
                    style={{ backgroundColor: theme.colors.tertiary }}
                    loading={isSampleLoading}
                    disabled={isSampleLoading}
                >
                    Load & Process Sample Audio
                </Button>
            </View>

            {isSampleLoading && (
                <View style={styles.loadingContainer}>
                    <Text variant="titleMedium">Loading and processing sample audio...</Text>
                </View>
            )}
            
            {sampleFile && (
                <View style={styles.resultContainer}>
                    <Text variant="titleMedium">Sample Audio Loaded:</Text>
                    <Text>Name: {sampleFile.name}</Text>
                    <Text>Duration: {sampleFile.durationMs}ms</Text>
                    <Text>Size: {sampleFile.size} bytes</Text>
                </View>
            )}

            {result && (
                <View style={styles.resultContainer}>
                    <Text variant="titleMedium">Hello Result:</Text>
                    <Text>{result}</Text>
                </View>
            )}

            {validationResult && (
                <View style={styles.resultContainer}>
                    <Text variant="titleMedium">Integration Validation:</Text>
                    <Text>Success: {validationResult.success ? 'Yes' : 'No'}</Text>
                    {validationResult.audioProcessorInitialized !== undefined && (
                        <Text>AudioProcessor Initialized: {validationResult.audioProcessorInitialized ? 'Yes' : 'No'}</Text>
                    )}
                    {validationResult.audioProcessorClass && (
                        <Text>AudioProcessor Class: {validationResult.audioProcessorClass}</Text>
                    )}
                    {validationResult.message && (
                        <Text>Message: {validationResult.message}</Text>
                    )}
                    {validationResult.error && (
                        <Text>Error: {validationResult.error}</Text>
                    )}
                    {validationResult.errorType && (
                        <Text>Error Type: {validationResult.errorType}</Text>
                    )}
                </View>
            )}
            
            {audioProcessingResult && (
                <View style={[
                    styles.resultContainer, 
                    { backgroundColor: audioProcessingResult.success ? 
                        theme.colors.tertiaryContainer : 
                        theme.colors.errorContainer 
                    }
                ]}>
                    <Text variant="titleMedium">Audio Processing Result:</Text>
                    <Text>Success: {audioProcessingResult.success ? 'Yes' : 'No'}</Text>
                    {audioProcessingResult.moduleAvailable !== undefined && (
                        <Text>Module Available: {audioProcessingResult.moduleAvailable ? 'Yes' : 'No'}</Text>
                    )}
                    {audioProcessingResult.durationMs !== undefined && (
                        <Text>Duration: {audioProcessingResult.durationMs}ms</Text>
                    )}
                    {audioProcessingResult.message && (
                        <Text>Message: {audioProcessingResult.message}</Text>
                    )}
                    {audioProcessingResult.error && (
                        <Text style={{ color: theme.colors.error }}>
                            Error: {audioProcessingResult.error}
                        </Text>
                    )}
                </View>
            )}
        </ScreenWrapper>
    );
};

export default PlaygroundAPIScreen;