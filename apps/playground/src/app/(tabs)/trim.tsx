import { AppTheme, Notice, NumberAdjuster, ScreenWrapper, useTheme, useToast } from '@siteed/design-system'
import { trimAudio, TrimAudioOptions, TrimAudioResult } from '@siteed/expo-audio-stream'
import { AudioTimeRangeSelector } from '@siteed/expo-audio-ui'
import * as DocumentPicker from 'expo-document-picker'
import React, { useCallback, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, ProgressBar, SegmentedButtons, Text } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TrimVisualization from '../../components/TrimVisualization'
import { baseLogger } from '../../config'
import { useSampleAudio } from '../../hooks/useSampleAudio'

const logger = baseLogger.extend('TrimScreen')

interface AudioFile {
    fileUri: string
    mimeType: string
    filename: string
    durationMs?: number
}

interface TimeRange {
    startTimeMs: number
    endTimeMs: number
    id: string
}

const getStyles = ({ theme, insets }: { theme: AppTheme, insets?: { bottom: number, top: number } }) => {
    return StyleSheet.create({
        container: {
            gap: theme.spacing.gap || 16,
            paddingHorizontal: theme.padding.s,
            paddingBottom: insets?.bottom || 80,
            paddingTop: Math.max(insets?.top || 0, 10),
        },
        rangeContainer: {
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: 8,
            padding: 12,
            marginBottom: 8,
        },
        rangeHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
        },
        chipContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 8,
        },
        resultContainer: {
            backgroundColor: theme.colors.secondaryContainer,
            padding: 16,
            borderRadius: 8,
            marginTop: 16,
        }
    })
}

export default function TrimScreen() {
    const theme = useTheme()
    const { bottom, top } = useSafeAreaInsets()
    const styles = useMemo(() => getStyles({ theme, insets: { bottom, top } }), [theme, bottom, top])
    const colors = theme.colors
    const { show } = useToast()

    // Audio file state
    const [currentFile, setCurrentFile] = useState<AudioFile | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string>()
    const [progress, setProgress] = useState(0)
    const [trimResult, setTrimResult] = useState<TrimAudioResult | null>(null)

    // Trim parameters
    const [trimMode, setTrimMode] = useState<'single' | 'keep' | 'remove'>('single')
    const [startTime, setStartTime] = useState<number>(0)
    const [endTime, setEndTime] = useState<number>(10000)
    const [timeRanges, setTimeRanges] = useState<TimeRange[]>([])
    const [outputFormat, setOutputFormat] = useState<'wav' | 'aac' | 'mp3' | 'opus'>('wav')
    const [showManualInput, setShowManualInput] = useState(false)

    // Add this to your state declarations
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingModeChange, setPendingModeChange] = useState<'single' | 'keep' | 'remove' | null>(null);

    const { isLoading: isSampleLoading, loadSampleAudio } = useSampleAudio({
        onError: (error) => {
            logger.error('Error loading sample audio file:', error)
            show({
                type: 'error',
                message: 'Error loading sample audio file',
                duration: 3000
            })
        }
    })

    const pickAudioFile = useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['audio/*'],
                copyToCacheDirectory: true,
            })

            if (result.canceled) return

            const newFile = {
                fileUri: result.assets[0].uri,
                mimeType: result.assets[0].mimeType ?? 'audio/*',
                filename: result.assets[0].name ?? 'Unknown'
            }
            
            setCurrentFile(newFile)
            setTrimResult(null)
            setError(undefined)
            setProgress(0)
            
            // Automatically select matching output format based on file type
            const mimeType = newFile.mimeType.toLowerCase()
            const extension = newFile.filename.split('.').pop()?.toLowerCase() || ''
            
            if (mimeType.includes('wav') || extension === 'wav') {
                setOutputFormat('wav')
            } else if (mimeType.includes('aac') || extension === 'aac') {
                setOutputFormat('aac')
            } else if (mimeType.includes('mp3') || extension === 'mp3') {
                setOutputFormat('mp3')
            } else if (mimeType.includes('opus') || extension === 'opus') {
                setOutputFormat('opus')
            }
            // If no match, keep current format
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load audio')
            show({
                type: 'error',
                message: 'Failed to load audio file',
                duration: 3000
            })
        }
    }, [show])

    const handleLoadSampleAudio = useCallback(async () => {
        try {
            setIsProcessing(true)
            
            // Load the sample audio
            const sampleFile = await loadSampleAudio(require('@assets/jfk.mp3'))
            
            if (!sampleFile) {
                throw new Error('Failed to load sample audio file')
            }
            
            // Update state with the sample file details
            setCurrentFile({
                fileUri: sampleFile.uri,
                mimeType: 'audio/mp3',
                filename: 'JFK Speech Sample',
                durationMs: 60000 // Approximate duration for the sample
            })
            
            // Set output format to match the sample file (mp3)
            setOutputFormat('mp3')
            
            setTrimResult(null)
            setError(undefined)
            setProgress(0)
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sample audio')
            show({
                type: 'error',
                message: 'Failed to load sample audio',
                duration: 3000
            })
        } finally {
            setIsProcessing(false)
        }
    }, [loadSampleAudio, show])

    const handleRangeChange = useCallback((newStartTime: number, newEndTime: number) => {
        setStartTime(newStartTime)
        setEndTime(newEndTime)
    }, [])

    const addTimeRange = useCallback(() => {
        if (startTime >= endTime) {
            show({
                type: 'error',
                message: 'End time must be greater than start time',
                duration: 3000
            })
            return
        }

        const newRange: TimeRange = {
            startTimeMs: startTime,
            endTimeMs: endTime,
            id: Date.now().toString()
        }

        setTimeRanges(prev => [...prev, newRange])
    }, [startTime, endTime, show])

    const removeTimeRange = useCallback((id: string) => {
        setTimeRanges(prev => prev.filter(range => range.id !== id))
    }, [])

    const handleModeChange = (newMode: 'single' | 'keep' | 'remove') => {
        // Check if we need to confirm mode switch
        if (
            (trimMode === 'single' && (startTime > 0 || endTime < (currentFile?.durationMs || 60000))) ||
            ((trimMode === 'keep' || trimMode === 'remove') && timeRanges.length > 0)
        ) {
            // Store the pending mode change and show confirmation dialog
            setPendingModeChange(newMode);
            setShowConfirmDialog(true);
        } else {
            // No confirmation needed, just switch
            applyModeChange(newMode);
        }
    };

    const applyModeChange = (newMode: 'single' | 'keep' | 'remove') => {
        setTrimMode(newMode);
        // Reset ranges when switching modes
        if (newMode !== 'single') {
            setTimeRanges([]);
        } else {
            // Reset to default range for single mode
            setStartTime(0);
            setEndTime(currentFile?.durationMs || 60000);
        }
        // Clear pending mode change
        setPendingModeChange(null);
    };

    const handleTrimAudio = useCallback(async () => {
        if (!currentFile) return

        try {
            setIsProcessing(true)
            setProgress(0)
            setError(undefined)
            setTrimResult(null)

            show({
                loading: true,
                message: 'Trimming audio...'
            })

            // Prepare trim options based on mode
            const trimOptions: TrimAudioOptions = {
                fileUri: currentFile.fileUri,
                mode: trimMode,
                outputFormat: {
                    format: outputFormat
                }
            }

            if (trimMode === 'single') {
                trimOptions.startTimeMs = startTime
                trimOptions.endTimeMs = endTime
            } else {
                // For keep or remove modes, use the time ranges
                trimOptions.ranges = timeRanges.map(range => ({
                    startTimeMs: range.startTimeMs,
                    endTimeMs: range.endTimeMs
                }))
            }

            // Execute trim with progress callback
            const result = await trimAudio(
                trimOptions,
                (progressEvent) => {
                    setProgress(progressEvent.progress / 100)
                }
            )

            setTrimResult(result)
            
            show({
                type: 'success',
                message: 'Audio trimmed successfully',
                stackBehavior: {
                    isStackable: false,
                },
                duration: 2000
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to trim audio')
            show({
                type: 'error',
                message: 'Failed to trim audio',
                duration: 3000
            })
            console.error('Error trimming audio:', err)
        } finally {
            setIsProcessing(false)
        }
    }, [currentFile, trimMode, startTime, endTime, timeRanges, outputFormat, show])

    const renderSingleModeControls = () => (
        <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text variant="titleMedium">Trim Range</Text>
                <Button
                    mode="text"
                    icon={showManualInput ? "keyboard-close" : "pencil"}
                    onPress={() => setShowManualInput(prev => !prev)}
                    compact
                >
                    {showManualInput ? "Hide" : "Edit"}
                </Button>
            </View>
            
            <AudioTimeRangeSelector
                durationMs={currentFile?.durationMs || 60000}
                startTime={startTime}
                endTime={endTime}
                onRangeChange={handleRangeChange}
                disabled={isProcessing}
                theme={{
                    container: {
                        backgroundColor: colors.surfaceVariant,
                        height: 40,
                        borderRadius: 8,
                    },
                    selectedRange: {
                        backgroundColor: colors.primary,
                        opacity: 0.5,
                    },
                    handle: {
                        backgroundColor: colors.primary,
                        width: 12,
                    },
                }}
            />
            
            {showManualInput && (
                <View style={{ gap: 12, marginTop: 16 }}>
                    <NumberAdjuster
                        label="Start Time (ms)"
                        value={startTime}
                        onChange={setStartTime}
                        min={0}
                        max={currentFile?.durationMs || 60000}
                        step={100}
                        disabled={isProcessing}
                    />
                    <NumberAdjuster
                        label="End Time (ms)"
                        value={endTime}
                        onChange={setEndTime}
                        min={0}
                        max={currentFile?.durationMs || 60000}
                        step={100}
                        disabled={isProcessing}
                    />
                </View>
            )}
        </View>
    )

    const renderRangesControls = () => (
        <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text variant="titleMedium">Time Ranges ({trimMode === 'keep' ? 'Keep' : 'Remove'})</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button
                        mode="text"
                        onPress={() => setShowManualInput(prev => !prev)}
                        compact
                    >
                        {showManualInput ? "Hide" : "Edit"}
                    </Button>
                    <Button 
                        mode="contained-tonal" 
                        onPress={addTimeRange}
                        disabled={isProcessing}
                    >
                        Add Range
                    </Button>
                </View>
            </View>
            
            <AudioTimeRangeSelector
                durationMs={currentFile?.durationMs || 60000}
                startTime={startTime}
                endTime={endTime}
                onRangeChange={handleRangeChange}
                disabled={isProcessing}
                theme={{
                    container: {
                        backgroundColor: colors.surfaceVariant,
                        height: 40,
                        borderRadius: 8,
                    },
                    selectedRange: {
                        backgroundColor: colors.primary,
                        opacity: 0.5,
                    },
                    handle: {
                        backgroundColor: colors.primary,
                        width: 12,
                    },
                }}
            />
            
            {showManualInput && (
                <View style={{ gap: 12, marginTop: 16, marginBottom: 16 }}>
                    <NumberAdjuster
                        label="Start Time (ms)"
                        value={startTime}
                        onChange={setStartTime}
                        min={0}
                        max={currentFile?.durationMs || 60000}
                        step={100}
                        disabled={isProcessing}
                    />
                    <NumberAdjuster
                        label="End Time (ms)"
                        value={endTime}
                        onChange={setEndTime}
                        min={0}
                        max={currentFile?.durationMs || 60000}
                        step={100}
                        disabled={isProcessing}
                    />
                </View>
            )}
            
            {timeRanges.length > 0 ? (
                <View style={{ marginTop: 8 }}>
                    <Text variant="bodyMedium" style={{ marginBottom: 4 }}>Selected Ranges:</Text>
                    <View style={styles.chipContainer}>
                        {timeRanges.map((range) => (
                            <View 
                                key={range.id} 
                                style={{ 
                                    backgroundColor: colors.secondaryContainer,
                                    borderRadius: 4,
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8
                                }}
                            >
                                <Text style={{ fontSize: 12 }}>
                                    {(range.startTimeMs / 1000).toFixed(1)}s - {(range.endTimeMs / 1000).toFixed(1)}s
                                </Text>
                                <Text 
                                    style={{ 
                                        fontSize: 14, 
                                        color: colors.error,
                                        fontWeight: 'bold',
                                        paddingHorizontal: 4
                                    }}
                                    onPress={() => removeTimeRange(range.id)}
                                >
                                    ✕
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            ) : (
                <Notice
                    type="info"
                    message={`Add time ranges to ${trimMode === 'keep' ? 'keep' : 'remove'} from the audio file.`}
                />
            )}
        </View>
    )

    const renderModeSelector = () => (
        <View>
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>Trim Mode</Text>
            <SegmentedButtons
                value={trimMode}
                onValueChange={(value) => handleModeChange(value as 'single' | 'keep' | 'remove')}
                buttons={[
                    { value: 'single', label: 'Single Range' },
                    { value: 'keep', label: 'Keep Ranges' },
                    { value: 'remove', label: 'Remove Ranges' },
                ]}
            />
            
            {/* Mode explainer */}
            <View style={{ marginTop: 8, backgroundColor: colors.surfaceVariant, padding: 12, borderRadius: 8 }}>
                {trimMode === 'single' ? (
                    <View>
                        <Text variant="titleSmall" style={{ marginBottom: 4 }}>Single Range Mode</Text>
                        <Text>
                            Extracts a single continuous section of audio between the start and end times.
                            Everything outside this range will be removed.
                        </Text>
                    </View>
                ) : trimMode === 'keep' ? (
                    <View>
                        <Text variant="titleSmall" style={{ marginBottom: 4 }}>Keep Ranges Mode</Text>
                        <Text>
                            Keeps multiple selected time ranges and removes everything else.
                            Useful for extracting several important segments from a longer recording.
                        </Text>
                    </View>
                ) : (
                    <View>
                        <Text variant="titleSmall" style={{ marginBottom: 4 }}>Remove Ranges Mode</Text>
                        <Text>
                            Removes the selected time ranges and keeps everything else.
                            Perfect for cutting out unwanted sections while preserving the rest.
                        </Text>
                    </View>
                )}
            </View>
            
            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <View style={{ 
                    marginTop: 8, 
                    backgroundColor: colors.errorContainer, 
                    padding: 12, 
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.error
                }}>
                    <Text variant="titleSmall" style={{ color: colors.error, marginBottom: 4 }}>
                        Reset Selection?
                    </Text>
                    <Text style={{ marginBottom: 8 }}>
                        Switching modes will reset your current selection. Continue?
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                        <Button 
                            mode="text" 
                            onPress={() => {
                                setShowConfirmDialog(false);
                                setPendingModeChange(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            mode="contained" 
                            onPress={() => {
                                setShowConfirmDialog(false);
                                if (pendingModeChange) {
                                    applyModeChange(pendingModeChange);
                                }
                            }}
                        >
                            Continue
                        </Button>
                    </View>
                </View>
            )}
        </View>
    )

    return (
        <ScreenWrapper 
            withScrollView 
            useInsets={false} 
            contentContainerStyle={styles.container}
        >
            <View style={{ gap: 16 }}>
                <Notice
                    type="info"
                    title="Audio Trimming"
                    message="Select an audio file and trim it using different modes: single range, keep ranges, or remove ranges."
                />

                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button 
                        mode="contained" 
                        onPress={pickAudioFile}
                        icon="file-upload"
                        loading={isProcessing && !isSampleLoading}
                        disabled={isProcessing}
                        style={{ flex: 1 }}
                    >
                        Select Audio File
                    </Button>

                    <Button 
                        mode="contained-tonal" 
                        onPress={handleLoadSampleAudio}
                        icon="music-box"
                        loading={isSampleLoading}
                        disabled={isProcessing}
                    >
                        Load Sample
                    </Button>
                </View>

                {currentFile && (
                    <View style={{ gap: 16 }}>
                        <View style={{ gap: 8, backgroundColor: colors.secondaryContainer, padding: 16, borderRadius: 8 }}>
                            <Text variant="titleMedium">File Details</Text>
                            <Text>Filename: {currentFile.filename}</Text>
                            <Text>Type: {currentFile.mimeType}</Text>
                        </View>

                        {renderModeSelector()}

                        {trimMode === 'single' ? renderSingleModeControls() : renderRangesControls()}

                        <View>
                            <Text variant="titleMedium" style={{ marginBottom: 8 }}>Output Format</Text>
                            <SegmentedButtons
                                value={outputFormat}
                                onValueChange={(value) => setOutputFormat(value as 'wav' | 'aac' | 'mp3' | 'opus')}
                                buttons={[
                                    { value: 'wav', label: 'WAV' },
                                    { value: 'aac', label: 'AAC' },
                                    { value: 'mp3', label: 'MP3' },
                                    { value: 'opus', label: 'Opus' },
                                ]}
                            />
                        </View>

                        <TrimVisualization 
                            durationMs={currentFile?.durationMs || 60000}
                            mode={trimMode}
                            startTime={startTime}
                            endTime={endTime}
                            ranges={timeRanges}
                        />

                        <Button 
                            mode="contained" 
                            onPress={handleTrimAudio}
                            icon="content-cut"
                            loading={isProcessing}
                            disabled={isProcessing || (trimMode !== 'single' && timeRanges.length === 0)}
                        >
                            Trim Audio
                        </Button>

                        {isProcessing && (
                            <View>
                                <Text style={{ marginBottom: 4 }}>Progress: {Math.round(progress * 100)}%</Text>
                                <ProgressBar progress={progress} color={colors.primary} />
                            </View>
                        )}
                    </View>
                )}

                {error && (
                    <Notice
                        type="error"
                        title="Error"
                        message={error}
                    />
                )}

                {trimResult && (
                    <View style={styles.resultContainer}>
                        <Text variant="titleMedium" style={{ marginBottom: 8 }}>Trim Result</Text>
                        <Text>Output URI: {trimResult.uri}</Text>
                        <Text>Filename: {trimResult.filename}</Text>
                        <Text>Duration: {(trimResult.durationMs / 1000).toFixed(1)}s</Text>
                        <Text>Size: {(trimResult.size / 1024).toFixed(1)} KB</Text>
                        <Text>Format: {trimResult.mimeType}</Text>
                        <Text>Sample Rate: {trimResult.sampleRate} Hz</Text>
                        <Text>Channels: {trimResult.channels}</Text>
                        <Text>Bit Depth: {trimResult.bitDepth} bits</Text>
                        
                        {trimResult.compression && (
                            <View style={{ marginTop: 8 }}>
                                <Text variant="titleSmall">Compression</Text>
                                <Text>Format: {trimResult.compression.format}</Text>
                                <Text>Bitrate: {trimResult.compression.bitrate} kbps</Text>
                                <Text>Size: {(trimResult.compression.size / 1024).toFixed(1)} KB</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </ScreenWrapper>
    )
} 