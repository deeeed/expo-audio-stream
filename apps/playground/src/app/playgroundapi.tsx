import React, { useMemo, useState } from 'react'

import PlaygroundAPIModule from 'playgroundapi'
import { StyleSheet, View } from 'react-native'
import { Button, Divider, Text } from 'react-native-paper'

import type { AppTheme } from '@siteed/design-system'
import { ScreenWrapper, useThemePreferences } from '@siteed/design-system'

import { useSampleAudio } from '../hooks/useSampleAudio'
import { useScreenHeader } from '../hooks/useScreenHeader'

interface ValidationResult {
  success: boolean;
  message?: string;
  error?: string;
  audioProcessorInitialized?: boolean;
  audioProcessorClass?: string;
  essentiaModuleClassFound?: boolean;
  essentiaModuleClassName?: string;
  jniConnectionSuccessful?: boolean;
  jniTestResult?: string;
  validationSteps?: string[];
}

interface ModuleImportsResult {
  success: boolean;
  audioProcessorImported?: boolean;
  audioProcessorClass?: string;
  essentiaModuleImported?: boolean;
  essentiaModuleClass?: string;
  modules?: { name: string; exists: boolean }[];
  error?: string;
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
        sectionContainer: {
            marginTop: 20,
        },
        sectionTitle: {
            marginBottom: 10,
        },
        successContainer: {
            backgroundColor: theme.colors.secondaryContainer,
        },
        errorContainer: {
            backgroundColor: theme.colors.errorContainer,
        },
        loadingContainer: {
            backgroundColor: theme.colors.tertiaryContainer,
            padding: theme.padding.s,
            borderRadius: theme.roundness,
            marginTop: 10,
        },
    })
}

const PlaygroundAPIScreen = () => {
    const { theme } = useThemePreferences()
    const styles = useMemo(() => getStyles({ theme }), [theme])
    const [result, setResult] = useState<string | null>(null)
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
    const [audioValidationResult, setAudioValidationResult] = useState<ValidationResult | null>(null)
    const [versionResult, setVersionResult] = useState<{ version?: string, error?: string } | null>(null)
    const [moduleImportsResult, setModuleImportsResult] = useState<ModuleImportsResult | null>(null)
    const [audioProcessingResult, setAudioProcessingResult] = useState<AudioProcessingResult | null>(null)
    
    useScreenHeader({
        title: 'Playground API',
        backBehavior: {
          fallbackUrl: '/more',
        },
      })


    // Use the sample audio hook for audio demos
    const { isLoading: isSampleLoading, sampleFile, loadSampleAudio } = useSampleAudio({
        onError: (error) => {
            console.error('Failed to load sample audio:', error)
        },
    })
    
    const handleHello = async () => { 
        try {
            const result = PlaygroundAPIModule.hello()
            console.log(result)
            setResult(result)
        } catch (error) {
            console.error(error)
            setResult(`Error: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    const handleValidateEssentiaIntegration = async () => {
        try {
            const result = await PlaygroundAPIModule.validateEssentiaIntegration()
            console.log('Essentia validation result:', result)
            setValidationResult(result)
        } catch (error) {
            console.error('Essentia validation error:', error)
            setValidationResult({
                success: false,
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    const handleValidateAudioProcessor = async () => {
        try {
            const result = await PlaygroundAPIModule.validateAudioProcessorIntegration()
            console.log('Audio processor validation result:', result)
            setAudioValidationResult(result)
        } catch (error) {
            console.error('Audio processor validation error:', error)
            setAudioValidationResult({
                success: false,
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    const handleTestEssentiaVersion = async () => {
        try {
            const result = await PlaygroundAPIModule.testEssentiaVersion()
            console.log('Essentia version test:', result)
            setVersionResult({
                version: result.version,
                error: result.error,
            })
        } catch (error) {
            console.error('Essentia version test error:', error)
            setVersionResult({
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    const handleCheckModuleImports = async () => {
        try {
            const result = await PlaygroundAPIModule.checkModuleImports()
            console.log('Module imports check:', result)
            setModuleImportsResult(result)
        } catch (error) {
            console.error('Module imports check error:', error)
            setModuleImportsResult({
                success: false,
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    const handleProcessAudio = async () => {
        try {
            // Load sample audio file
            const sampleAudioAsset = require('@assets/jfk.mp3')
            const loadedSample = await loadSampleAudio(sampleAudioAsset, 'jfk.mp3')
            
            if (!loadedSample) {
                throw new Error('Failed to load sample audio file')
            }
            
            console.log('Using sample audio file:', loadedSample.name, 'at path:', loadedSample.uri)
            
            // Process with module
            const result = await PlaygroundAPIModule.processAudioWithModule(loadedSample.uri)
            console.log('Audio processing result:', result)
            
            setAudioProcessingResult(result)
        } catch (error) {
            console.error('Audio processing error:', error)
            setAudioProcessingResult({
                success: false,
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    return (
        <ScreenWrapper withScrollView contentContainerStyle={styles.container}>
            <Text variant="headlineMedium">Module Integration Tests</Text>
            
            <View style={styles.sectionContainer}>
                <Text variant="titleLarge" style={styles.sectionTitle}>Basic Tests</Text>
                <Button mode="contained" onPress={handleHello}>Test Hello Function</Button>
                <Button mode="contained" onPress={handleCheckModuleImports} style={{ marginTop: 10 }}>
                    Check Module Imports
                </Button>
            </View>
            
            <Divider style={{ marginTop: 20 }} />
            
            <View style={styles.sectionContainer}>
                <Text variant="titleLarge" style={styles.sectionTitle}>Essentia Module Tests</Text>
                <Button 
                    mode="contained" 
                    onPress={handleValidateEssentiaIntegration}
                    style={{ backgroundColor: theme.colors.secondary }}
                >
                    Validate Essentia Integration
                </Button>
                <Button 
                    mode="contained" 
                    onPress={handleTestEssentiaVersion}
                    style={{ marginTop: 10 }}
                >
                    Test Essentia Version
                </Button>
            </View>
            
            <Divider style={{ marginTop: 20 }} />
            
            <View style={styles.sectionContainer}>
                <Text variant="titleLarge" style={styles.sectionTitle}>Audio Processor Tests</Text>
                <Button 
                    mode="contained" 
                    onPress={handleValidateAudioProcessor}
                    style={{ backgroundColor: theme.colors.tertiary }}
                >
                    Validate Audio Processor
                </Button>
                <Button 
                    mode="contained" 
                    onPress={handleProcessAudio}
                    style={{ marginTop: 10 }}
                    loading={isSampleLoading}
                    disabled={isSampleLoading}
                >
                    Process Sample Audio
                </Button>
            </View>
            
            {isSampleLoading && (
                <View style={styles.loadingContainer}>
                    <Text>Loading and processing sample audio...</Text>
                </View>
            )}
            
            {/* Results Sections */}
            {result && (
                <View style={styles.resultContainer}>
                    <Text variant="titleMedium">Hello Result:</Text>
                    <Text>{result}</Text>
                </View>
            )}
            
            {validationResult && (
                <View
style={[
                    styles.resultContainer,
                    validationResult.success ? styles.successContainer : styles.errorContainer,
                ]}
                >
                    <Text variant="titleMedium">Essentia Integration Validation:</Text>
                    <Text>Success: {validationResult.success ? 'Yes' : 'No'}</Text>
                    
                    {validationResult.essentiaModuleClassFound !== undefined && (
                        <Text>Module Class Found: {validationResult.essentiaModuleClassFound ? 'Yes' : 'No'}</Text>
                    )}
                    
                    {validationResult.essentiaModuleClassName && (
                        <Text>Module Class: {validationResult.essentiaModuleClassName}</Text>
                    )}
                    
                    {validationResult.jniConnectionSuccessful !== undefined && (
                        <Text>JNI Connection: {validationResult.jniConnectionSuccessful ? 'Successful' : 'Failed'}</Text>
                    )}
                    
                    {validationResult.jniTestResult && (
                        <Text>JNI Test Result: {validationResult.jniTestResult}</Text>
                    )}
                    
                    {validationResult.validationSteps && (
                        <View style={{ marginTop: 10 }}>
                            <Text style={{ fontWeight: 'bold' }}>Validation Steps:</Text>
                            {validationResult.validationSteps.map((step, index) => (
                                <Text key={index} style={{ fontSize: 12 }}>
                                    {index + 1}. {step}
                                </Text>
                            ))}
                        </View>
                    )}
                    
                    {validationResult.error && (
                        <Text style={{ color: theme.colors.error }}>
                            Error: {validationResult.error}
                        </Text>
                    )}
                </View>
            )}

            {audioValidationResult && (
                <View
style={[
                    styles.resultContainer,
                    audioValidationResult.success ? styles.successContainer : styles.errorContainer,
                ]}
                >
                    <Text variant="titleMedium">Audio Processor Validation:</Text>
                    <Text>Success: {audioValidationResult.success ? 'Yes' : 'No'}</Text>
                    
                    {audioValidationResult.audioProcessorInitialized !== undefined && (
                        <Text>Processor Initialized: {audioValidationResult.audioProcessorInitialized ? 'Yes' : 'No'}</Text>
                    )}
                    
                    {audioValidationResult.audioProcessorClass && (
                        <Text>Processor Class: {audioValidationResult.audioProcessorClass}</Text>
                    )}
                    
                    {audioValidationResult.message && (
                        <Text>Message: {audioValidationResult.message}</Text>
                    )}
                    
                    {audioValidationResult.error && (
                        <Text style={{ color: theme.colors.error }}>
                            Error: {audioValidationResult.error}
                        </Text>
                    )}
                </View>
            )}

            {versionResult && (
                <View
style={[
                    styles.resultContainer,
                    versionResult.version ? styles.successContainer : styles.errorContainer,
                ]}
                >
                    <Text variant="titleMedium">Essentia Version:</Text>
                    {versionResult.version && (
                        <Text>Version: {versionResult.version}</Text>
                    )}
                    {versionResult.error && (
                        <Text style={{ color: theme.colors.error }}>
                            Error: {versionResult.error}
                        </Text>
                    )}
                </View>
            )}
            
            {moduleImportsResult && (
                <View
style={[
                    styles.resultContainer,
                    moduleImportsResult.success ? styles.successContainer : styles.errorContainer,
                ]}
                >
                    <Text variant="titleMedium">Module Imports Check:</Text>
                    <Text>Success: {moduleImportsResult.success ? 'Yes' : 'No'}</Text>
                    
                    {moduleImportsResult.audioProcessorImported !== undefined && (
                        <Text>Audio Processor Imported: {moduleImportsResult.audioProcessorImported ? 'Yes' : 'No'}</Text>
                    )}
                    
                    {moduleImportsResult.essentiaModuleImported !== undefined && (
                        <Text>Essentia Module Imported: {moduleImportsResult.essentiaModuleImported ? 'Yes' : 'No'}</Text>
                    )}
                    
                    {moduleImportsResult.modules && moduleImportsResult.modules.length > 0 && (
                        <View style={{ marginTop: 10 }}>
                            <Text style={{ fontWeight: 'bold' }}>Module Availability:</Text>
                            {moduleImportsResult.modules.map((module, index) => (
                                <Text key={index}>
                                    {module.name}: {module.exists ? 'Available' : 'Not Available'}
                                </Text>
                            ))}
                        </View>
                    )}
                    
                    {moduleImportsResult.error && (
                        <Text style={{ color: theme.colors.error }}>
                            Error: {moduleImportsResult.error}
                        </Text>
                    )}
                </View>
            )}
            
            {audioProcessingResult && (
                <View
style={[
                    styles.resultContainer,
                    audioProcessingResult.success ? styles.successContainer : styles.errorContainer,
                ]}
                >
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

            {sampleFile && (
                <View style={styles.resultContainer}>
                    <Text variant="titleMedium">Sample Audio Loaded:</Text>
                    <Text>Name: {sampleFile.name}</Text>
                    <Text>Duration: {sampleFile.durationMs}ms</Text>
                    <Text>Size: {sampleFile.size} bytes</Text>
                    <Text>Path: {sampleFile.uri}</Text>
                </View>
            )}
        </ScreenWrapper>
    )
}

export default PlaygroundAPIScreen