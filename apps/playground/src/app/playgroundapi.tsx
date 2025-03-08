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
  essentiaModuleInitialized?: boolean;
  essentiaModuleClass?: string;
  essentiaModuleName?: string;
  stackTrace?: string;
  validationSteps?: string[];
  essentiaModuleClassFound?: boolean;
  essentiaModuleClassName?: string;
  essentiaModuleNameError?: string;
  jniTestResult?: string;
  jniConnectionSuccessful?: boolean;
  manualLibraryLoadSuccessful?: boolean;
  manualLibraryLoadError?: string;
  nativeSymbolFound?: boolean;
  moduleImportsCheck?: any;
  essentiaVersion?: string;
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
    const [essentiaValidationResult, setEssentiaValidationResult] = useState<ValidationResult | null>(null);
    
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

    const handleValidateEssentiaIntegration = async () => {
        try {
            const result = await PlaygroundAPIModule.validateEssentiaIntegration();
            console.log('Essentia validation result:', result);
            setEssentiaValidationResult(result);
        } catch (error) {
            console.error('Essentia validation error:', error);
            setEssentiaValidationResult({
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

    const handleCheckModuleImports = async () => {
        try {
            const result = await PlaygroundAPIModule.checkModuleImports();
            console.log('Module imports check:', result);
            setValidationResult({
                success: result.success,
                moduleImportsCheck: result
            });
        } catch (error) {
            console.error('Module imports check error:', error);
            setValidationResult({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    };

    const handleTestEssentiaVersion = async () => {
        try {
            const result = await PlaygroundAPIModule.testEssentiaVersion();
            console.log('Essentia version test:', result);
            setValidationResult({
                success: result.success,
                essentiaVersion: result.version
            });
        } catch (error) {
            console.error('Essentia version test error:', error);
            setValidationResult({
                success: false,
                error: error instanceof Error ? error.message : String(error)
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
                    onPress={handleValidateEssentiaIntegration}
                    style={{ backgroundColor: theme.colors.secondary }}
                >
                    Validate Essentia Integration
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
                <Button mode="contained" onPress={handleCheckModuleImports}>
                    Check Module Imports
                </Button>
                <Button mode="contained" onPress={handleTestEssentiaVersion}>
                    Test Essentia Version
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
            
            {essentiaValidationResult && (
                <View style={[
                    styles.resultContainer,
                    { backgroundColor: essentiaValidationResult.success ? 
                        theme.colors.secondaryContainer : 
                        theme.colors.errorContainer 
                    }
                ]}>
                    <Text variant="titleMedium">Essentia Integration Validation:</Text>
                    <Text>Success: {essentiaValidationResult.success ? 'Yes' : 'No'}</Text>
                    
                    {essentiaValidationResult.essentiaModuleClassFound !== undefined && (
                        <Text>Module Class Found: {essentiaValidationResult.essentiaModuleClassFound ? 'Yes' : 'No'}</Text>
                    )}
                    
                    {essentiaValidationResult.essentiaModuleClassName && (
                        <Text>Module Class: {essentiaValidationResult.essentiaModuleClassName}</Text>
                    )}
                    
                    {essentiaValidationResult.essentiaModuleName && (
                        <Text>Module Name: {essentiaValidationResult.essentiaModuleName}</Text>
                    )}
                    
                    {essentiaValidationResult.jniConnectionSuccessful !== undefined && (
                        <Text>JNI Connection: {essentiaValidationResult.jniConnectionSuccessful ? 'Successful' : 'Failed'}</Text>
                    )}
                    
                    {essentiaValidationResult.jniTestResult && (
                        <Text>JNI Test Result: {essentiaValidationResult.jniTestResult}</Text>
                    )}
                    
                    {essentiaValidationResult.manualLibraryLoadSuccessful !== undefined && (
                        <Text>Manual Library Load: {essentiaValidationResult.manualLibraryLoadSuccessful ? 'Successful' : 'Failed'}</Text>
                    )}
                    
                    {essentiaValidationResult.nativeSymbolFound !== undefined && (
                        <Text>Native Symbol Found: {essentiaValidationResult.nativeSymbolFound ? 'Yes' : 'No'}</Text>
                    )}
                    
                    {essentiaValidationResult.validationSteps && (
                        <View style={{ marginTop: 10 }}>
                            <Text style={{ fontWeight: 'bold' }}>Validation Steps:</Text>
                            {essentiaValidationResult.validationSteps.map((step, index) => (
                                <Text key={index} style={{ fontSize: 12 }}>
                                    {index + 1}. {step}
                                </Text>
                            ))}
                        </View>
                    )}
                    
                    {essentiaValidationResult.error && (
                        <Text style={{ color: theme.colors.error }}>
                            Error: {essentiaValidationResult.error}
                        </Text>
                    )}
                    
                    {/* Show additional error details */}
                    {essentiaValidationResult.manualLibraryLoadError && (
                        <Text style={{ color: theme.colors.error, fontSize: 12 }}>
                            Library Load Error: {essentiaValidationResult.manualLibraryLoadError}
                        </Text>
                    )}
                    
                    {essentiaValidationResult.stackTrace && (
                        <Text style={{ fontSize: 10, marginTop: 10 }}>
                            Stack Trace: {essentiaValidationResult.stackTrace.length > 200 ? 
                                `${essentiaValidationResult.stackTrace.substring(0, 200)}...` : 
                                essentiaValidationResult.stackTrace}
                        </Text>
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