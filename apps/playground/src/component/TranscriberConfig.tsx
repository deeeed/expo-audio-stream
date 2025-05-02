import React, { useCallback, useMemo, useState } from 'react'

import { Platform, StyleSheet, View } from 'react-native'
import { ProgressBar, Text } from 'react-native-paper'

import type { AppTheme } from '@siteed/design-system'
import { Button, EditableInfoCard, Notice, useModal, useTheme } from '@siteed/design-system'

import { baseLogger } from '../config'
import { TranscriptionConfigForm } from './TranscriptionConfigForm'
import { useTranscription } from '../context/TranscriptionProvider'

import type { TranscriptionConfigFormState } from './TranscriptionConfigForm'

const logger = baseLogger.extend('TranscriberConfig')

const getStyles = ({ theme }: { theme: AppTheme }) => {
    return StyleSheet.create({
        container: {
            marginVertical: theme.spacing.gap,
        },
        noticeContainer: {
            marginTop: theme.spacing.gap,
        },
        progressContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.gap,
        },
        progressBar: {
            flex: 1,
            height: 6,
            minWidth: Platform.OS === 'web' ? 100 : undefined,
            display: 'flex',
            opacity: 1,
        },
        progressText: {
            fontSize: 12,
            minWidth: 40,
            textAlign: 'right',
            color: theme.colors.onSurface,
        },
        statusText: {
            fontSize: 12,
            fontStyle: 'italic',
            marginTop: 2,
            color: theme.colors.onSurfaceVariant,
        },
        modelText: {
            fontSize: 14,
            fontWeight: '500',
            color: theme.colors.onSurface,
        },
        cardContent: {
            gap: theme.spacing.gap,
        },
        modelDetails: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.gap,
        },
        badge: {
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: theme.roundness,
            backgroundColor: theme.colors.surfaceVariant,
        },
        badgeText: {
            fontSize: 10,
            color: theme.colors.onSurfaceVariant,
        },
        readyBadge: {
            backgroundColor: theme.colors.primaryContainer,
        },
        notReadyBadge: {
            backgroundColor: theme.colors.errorContainer,
        },
        readyBadgeText: {
            color: theme.colors.onPrimaryContainer,
        },
        notReadyBadgeText: {
            color: theme.colors.onErrorContainer,
        },
        compactContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        compactInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.gap,
            flex: 1,
        },
        compactBadges: {
            flexDirection: 'row',
            gap: 4,
        },
        compactProgressContainer: {
            flex: 1,
            marginLeft: theme.spacing.gap,
        },
        initButton: {
            marginLeft: theme.spacing.gap,
            minWidth: 80,
        },
        detailedInitButton: {
            alignSelf: 'flex-start',
            marginTop: theme.spacing.gap / 2,
        },
    })
}

interface TranscriberConfigProps {
    compact?: boolean // If true, shows a more compact view
    onConfigChange?: () => void // Optional callback when config changes
}

export const TranscriberConfig = ({ compact = true, onConfigChange }: TranscriberConfigProps) => {
    const theme = useTheme()
    const styles = useMemo(() => getStyles({ theme }), [theme])
    
    const {
        model,
        multilingual,
        language,
        ready,
        quantized,
        updateConfig,
        isModelLoading,
        progressItems,
        initialize,
    } = useTranscription()
    
    const [selectedConfig, setSelectedConfig] = useState<TranscriptionConfigFormState>({
        model,
        multilingual,
        quantized,
        language,
        subtask: 'transcribe',
        tdrz: false,
    })
    
    const { openDrawer } = useModal()

    const hasEditedConfig = useMemo(() => {
        if (selectedConfig.model !== model) return true
        if (selectedConfig.multilingual !== multilingual) return true
        if (selectedConfig.quantized !== quantized) return true
        if (selectedConfig.language !== language) return true
        return false
    }, [selectedConfig, model, multilingual, quantized, language])

    // Get download progress information
    const downloadProgress = useMemo(() => {
        const modelItem = progressItems.find(
            (item) => item.name === model && item.status === 'downloading'
        )
        return modelItem ? modelItem.progress / 100 : 0
    }, [progressItems, model])

    const isDownloading = useMemo(() => {
        return progressItems.some(
            (item) => item.name === model && item.status === 'downloading'
        )
    }, [progressItems, model])

    // Format the model name based on platform
    const modelName = useMemo(() => {
        return Platform.OS === 'web' 
            ? model.replace('Xenova/whisper-', '') 
            : model
    }, [model])

    // Get status text based on model state
    const statusText = useMemo(() => {
        if (isDownloading) return 'Downloading model...'
        if (isModelLoading) return 'Initializing model...'
        if (ready) return 'Model ready'
        return 'Model not loaded'
    }, [isDownloading, isModelLoading, ready])

    // Render compact view
    const renderCompactView = () => (
        <View style={styles.compactContainer}>
            <View style={styles.compactInfo}>
                <Text style={styles.modelText}>{modelName}</Text>
                
                <View style={styles.compactBadges}>
                    {quantized && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Q</Text>
                        </View>
                    )}
                    {multilingual && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>M</Text>
                        </View>
                    )}
                    <View
style={[
                        styles.badge, 
                        ready ? styles.readyBadge : styles.notReadyBadge,
                    ]}
                    >
                        <Text
style={[
                            styles.badgeText,
                            ready ? styles.readyBadgeText : styles.notReadyBadgeText,
                        ]}
                        >
                            {ready ? '✓' : '×'}
                        </Text>
                    </View>
                </View>
                
                {(isDownloading || isModelLoading) && (
                    <View style={[styles.compactProgressContainer, { minHeight: 10, width: '100%' }]}>
                        <ProgressBar 
                            progress={isDownloading ? downloadProgress : 0.5} 
                            indeterminate={!isDownloading && isModelLoading}
                            style={[styles.progressBar, { height: 8, minHeight: 8 }]}
                            color={theme.colors.primary}
                        />
                    </View>
                )}
            </View>
            {!ready && !isModelLoading && !isDownloading && !hasEditedConfig && (
                <Button 
                    mode="contained" 
                    onPress={initialize}
                    compact
                    style={styles.initButton}
                    contentStyle={{ paddingHorizontal: 12 }}
                >
                    Load Model
                </Button>
            )}
        </View>
    )

    // Render detailed view
    const renderDetailedView = () => (
        <View style={styles.cardContent}>
            <Text style={styles.modelText}>{modelName}</Text>
            
            <View style={styles.modelDetails}>
                {quantized && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>Quantized</Text>
                    </View>
                )}
                {multilingual && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>Multilingual</Text>
                    </View>
                )}
                {language && language !== 'auto' && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>Lang: {language}</Text>
                    </View>
                )}
                <View
style={[
                    styles.badge, 
                    ready ? styles.readyBadge : styles.notReadyBadge,
                ]}
                >
                    <Text
style={[
                        styles.badgeText,
                        ready ? styles.readyBadgeText : styles.notReadyBadgeText,
                    ]}
                    >
                        {ready ? 'Ready' : 'Not Loaded'}
                    </Text>
                </View>
            </View>
            
            <Text style={styles.statusText}>{statusText}</Text>
            
            {(isDownloading || isModelLoading) && (
                <View style={[styles.progressContainer, { minHeight: 10, width: '100%' }]}>
                    <ProgressBar 
                        progress={isDownloading ? downloadProgress : 0.5} 
                        indeterminate={!isDownloading && isModelLoading}
                        style={[styles.progressBar, { height: 8, minHeight: 8 }]}
                        color={theme.colors.primary}
                    />
                    {isDownloading && (
                        <Text style={styles.progressText}>
                            {Math.round(downloadProgress * 100)}%
                        </Text>
                    )}
                </View>
            )}
            
            {!ready && !isModelLoading && !isDownloading && !hasEditedConfig && (
                <Button 
                    mode="contained" 
                    onPress={initialize}
                    style={styles.detailedInitButton}
                    icon="download"
                >
                    Load Model
                </Button>
            )}
        </View>
    )

    const [showNoChangesNotice, setShowNoChangesNotice] = useState(false)

    const handleConfigEdit = useCallback(async () => {
        const config = await openDrawer({
            title: 'Transcription Config',
            initialData: selectedConfig,
            bottomSheetProps: {
                enableDynamicSizing: true,
            },
            render: ({ resolve }) => (
                <TranscriptionConfigForm
                    config={selectedConfig}
                    onChange={(config) => {
                        resolve(config)
                    }}
                />
            ),
        })
        
        if (config) {
            // Check if config actually changed before updating
            const configChanged = 
                config.model !== selectedConfig.model ||
                config.multilingual !== selectedConfig.multilingual ||
                config.quantized !== selectedConfig.quantized ||
                config.language !== selectedConfig.language
                
            if (configChanged) {
                logger.log('config has changed', config)
                setSelectedConfig(config)
                
                // Immediately apply and initialize the new configuration
                try {
                    await updateConfig(config, true) // Set to true to initialize immediately
                    if (onConfigChange) onConfigChange()
                } catch (error) {
                    console.error('Failed to update and initialize config', error)
                }
            } else {
                // Show a temporary notice that no changes were made
                setShowNoChangesNotice(true)
                
                // Clear the notice after a few seconds
                setTimeout(() => {
                    setShowNoChangesNotice(false)
                }, 3000)
            }
        }
    }, [selectedConfig, openDrawer, updateConfig, onConfigChange])

    return (
        <View style={styles.container}>
            <EditableInfoCard
                label={compact ? 'Model' : 'Transcription Config'}
                value={modelName} // This is just a placeholder, we'll use renderValue
                renderValue={() => compact ? renderCompactView() : renderDetailedView()}
                editable
                onEdit={handleConfigEdit}
            />
            
            {/* We can keep this for when the model is loading */}
            {(isModelLoading || isDownloading) && (
                <View style={styles.noticeContainer}>
                    <Notice
                        type="info"
                        title="Initializing Model"
                        message={isDownloading ? 'Downloading model files...' : 'Setting up model...'}
                    />
                </View>
            )}
            
            {showNoChangesNotice && (
                <View style={styles.noticeContainer}>
                    <Notice
                        type="info"
                        title="No Changes Made"
                        message="Select a different model or configuration to apply changes."
                    />
                </View>
            )}
        </View>
    )
} 