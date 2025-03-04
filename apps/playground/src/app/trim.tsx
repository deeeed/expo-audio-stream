import { AppTheme, Notice, NumberAdjuster, EditableInfoCard, ScreenWrapper, useTheme, useToast } from '@siteed/design-system'
import { SampleRate, trimAudio, TrimAudioOptions, TrimAudioResult } from '@siteed/expo-audio-studio'
import { AudioTimeRangeSelector } from '@siteed/expo-audio-ui'
import { Audio, AVPlaybackStatus } from 'expo-av'
import * as DocumentPicker from 'expo-document-picker'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { Button, ProgressBar, SegmentedButtons, Text } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TrimVisualization from '../components/TrimVisualization'
import { baseLogger } from '../config'
import { useSampleAudio } from '../hooks/useSampleAudio'

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
    const [sound, setSound] = useState<Audio.Sound | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [playbackPosition, setPlaybackPosition] = useState(0)
    const playbackPositionRef = useRef(0)
    const [customFileName, setCustomFileName] = useState<string>('')

    // Trim parameters
    const [trimMode, setTrimMode] = useState<'single' | 'keep' | 'remove'>('single')
    const [startTime, setStartTime] = useState<number>(0)
    const [endTime, setEndTime] = useState<number>(10000)
    const [timeRanges, setTimeRanges] = useState<TimeRange[]>([])
    const [outputFormat, setOutputFormat] = useState<'wav' | 'aac' | 'opus'>('wav')
    const [outputSampleRate, setOutputSampleRate] = useState<SampleRate>(16000)
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

            const fileUri = result.assets[0].uri
            const mimeType = result.assets[0].mimeType ?? 'audio/*'
            const filename = result.assets[0].name ?? 'Unknown'
            
            // Show loading toast
            show({
                loading: true,
                message: 'Loading audio file...'
            })
            
            // Get audio duration by loading the file with Expo AV
            let durationMs = 0
            
            // Create a temporary sound object to get metadata
            const { sound: tempSound } = await Audio.Sound.createAsync(
                { uri: fileUri },
                { shouldPlay: false },
                null,
                true // Download first for accurate metadata
            )
            
            try {
                // Play and immediately stop to get accurate duration
                await tempSound.playAsync()
                await tempSound.stopAsync()
                
                // Get the loaded status to access metadata
                const loadedStatus = await tempSound.getStatusAsync()
                
                if (loadedStatus.isLoaded) {
                    durationMs = loadedStatus.durationMillis || 0
                    
                    console.log('Audio metadata loaded', {
                        durationMs,
                        filename
                    })
                }
            } catch (error) {
                console.warn('Error getting audio metadata:', error)
            } finally {
                // Always unload the temporary sound
                await tempSound.unloadAsync()
            }
            
            const newFile = {
                fileUri,
                mimeType,
                filename,
                durationMs
            }
            
            setCurrentFile(newFile)
            
            // Set the end time to match the actual duration
            setEndTime(durationMs)
            
            setTrimResult(null)
            setError(undefined)
            setProgress(0)
            
            // Generate a default filename for the trimmed output
            const baseName = filename.split('.').shift() || 'audio'
            setCustomFileName(`${baseName}_trimmed`)
            
            // Automatically select matching output format based on file type
            const lowerMimeType = mimeType.toLowerCase()
            const extension = filename.split('.').pop()?.toLowerCase() || ''
            
            if (lowerMimeType.includes('wav') || extension === 'wav') {
                setOutputFormat('wav')
            } else {
                // Default to 'aac' for any other format
                setOutputFormat('aac')
            }
            
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
                durationMs: sampleFile.durationMs // Use the actual duration from the sample file
            })
            
            // Set output format to 'aac' instead of 'mp3'
            setOutputFormat('aac')
            
            // Also update the end time to match the actual duration
            setEndTime(sampleFile.durationMs)
            
            // Set a default filename for the trimmed output
            setCustomFileName('jfk_speech_trimmed')
            
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
            
            // Unload any existing sound
            if (sound) {
                await sound.unloadAsync()
                setSound(null)
                setIsPlaying(false)
            }

            // Validate trim range and ensure we're not trimming the entire file
            // which seems to cause the native code to just copy the file
            const maxDuration = currentFile.durationMs || 60000;
            
            // Make sure we're not trying to trim the entire file
            let actualStartTime = Math.max(0, startTime);
            let actualEndTime = Math.min(endTime, maxDuration);
            
            // If we're selecting the entire file (or very close to it), adjust the range slightly
            if (actualStartTime <= 10 && actualEndTime >= maxDuration - 10) {
                // Add a small offset to start and end to force actual trimming
                actualStartTime = 10;
                actualEndTime = maxDuration - 10;
                
                console.log(`Adjusted range to ${actualStartTime}ms - ${actualEndTime}ms to force trimming`);
            }
            
            // Ensure we have a reasonable duration
            if (actualEndTime - actualStartTime < 100) {
                // If range is too small, adjust it
                actualEndTime = actualStartTime + 100;
                console.log(`Range too small, adjusted to ${actualStartTime}ms - ${actualEndTime}ms`);
            }
            
            console.log(`Trimming audio from ${actualStartTime}ms to ${actualEndTime}ms (duration: ${actualEndTime - actualStartTime}ms)`);

            // Prepare trim options based on mode
            const trimOptions: TrimAudioOptions = {
                fileUri: currentFile.fileUri,
                mode: trimMode,
                outputFormat: {
                    format: outputFormat,
                    sampleRate: outputSampleRate,
                    bitrate: outputFormat === 'wav' ? 16000 : 128000,
                }
            }

            // Add custom filename if provided
            if (customFileName) {
                // Ensure filename has the correct extension
                let finalFileName = customFileName;
                if (!finalFileName.toLowerCase().endsWith(`.${outputFormat}`)) {
                    finalFileName = `${finalFileName}.${outputFormat}`;
                }
                trimOptions.outputFileName = finalFileName;
            }

            if (trimMode === 'single') {
                trimOptions.startTimeMs = actualStartTime;
                trimOptions.endTimeMs = actualEndTime;
            } else {
                // For keep or remove modes, use the time ranges
                // Make sure none of the ranges cover the entire file
                trimOptions.ranges = timeRanges.map(range => {
                    const start = Math.max(10, range.startTimeMs);
                    const end = Math.min(range.endTimeMs, maxDuration - 10);
                    return { startTimeMs: start, endTimeMs: end };
                });
            }

            // Execute trim with progress callback
            const result = await trimAudio(
                trimOptions,
                (progressEvent) => {
                    setProgress(progressEvent.progress / 100)
                }
            )

            setTrimResult(result)
            
            // Show success toast with processing time information
            const processingTimeSeconds = result.processingInfo?.durationMs 
                ? (result.processingInfo.durationMs / 1000).toFixed(2) 
                : "unknown";
                
            show({
                type: 'success',
                message: `Audio trimmed successfully in ${processingTimeSeconds}s`,
                stackBehavior: {
                    isStackable: false,
                },
                duration: 3000
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
    }, [currentFile, sound, startTime, endTime, trimMode, outputFormat, outputSampleRate, customFileName, show, timeRanges])


    // Add this function to handle playback status updates
    const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return
        
        // Update position for progress tracking
        if (status.positionMillis !== undefined) {
            playbackPositionRef.current = status.positionMillis
            setPlaybackPosition(status.positionMillis)
        }
        
        // Handle playback state
        if (status.isPlaying !== undefined) {
            setIsPlaying(status.isPlaying)
        }
        
        // Handle playback completion
        if (status.didJustFinish) {
            setIsPlaying(false)
            setPlaybackPosition(0)
            playbackPositionRef.current = 0
        }
    }, [])
    

    // Add this function to handle audio playback
    const playTrimmedAudio = useCallback(async () => {
        try {
            // If sound is already loaded, unload it first
            if (sound) {
                await sound.unloadAsync()
                setSound(null)
                setIsPlaying(false)
                setPlaybackPosition(0)
                playbackPositionRef.current = 0
            }
            
            // Create and load the sound
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: trimResult?.uri || '' },
                { shouldPlay: true },
                onPlaybackStatusUpdate
            )
            
            // Set the sound state
            setSound(newSound)
            setIsPlaying(true)
            
            // Play the sound
            await newSound.playAsync()
            
        } catch (err) {
            console.error('Error playing audio:', err)
            show({
                type: 'error',
                message: 'Failed to play audio',
                duration: 3000
            })
        }
    }, [trimResult, sound, onPlaybackStatusUpdate, show])
    
    // Add this function to toggle play/pause
    const togglePlayback = useCallback(async () => {
        if (!sound) return
        
        if (isPlaying) {
            await sound.pauseAsync()
        } else {
            await sound.playAsync()
        }
    }, [sound, isPlaying])
    
    // Add this function to stop playback
    const stopPlayback = useCallback(async () => {
        if (!sound) return
        
        await sound.stopAsync()
        await sound.setPositionAsync(0)
        setPlaybackPosition(0)
        playbackPositionRef.current = 0
    }, [sound])
    
    // Clean up sound when component unmounts
    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync()
            }
        }
    }, [sound])

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

    const renderStopped = () => (
        <View style={{ gap: 10 }}>
            <EditableInfoCard
                label="File Name"
                value={customFileName}
                placeholder="Enter a filename for the trimmed audio"
                inlineEditable
                editable
                containerStyle={{
                    backgroundColor: colors.secondaryContainer,
                }}
                onInlineEdit={(newFileName) => {
                    if (typeof newFileName === 'string') {
                        setCustomFileName(newFileName)
                    }
                }}
            />

            {renderModeSelector()}

            {trimMode === 'single' ? renderSingleModeControls() : renderRangesControls()}

            <View>
                <Text variant="titleMedium" style={{ marginBottom: 8 }}>Output Format</Text>
                <SegmentedButtons
                    value={outputFormat}
                    onValueChange={(value) => setOutputFormat(value as 'wav' | 'aac' | 'opus')}
                    buttons={[
                        { value: 'wav', label: 'WAV' },
                                    { value: 'aac', label: 'AAC', disabled: Platform.OS === 'web' },
                        { value: 'opus', label: 'OPUS' },
                    ]}
                />
                            {Platform.OS === 'web' && outputFormat === 'aac' && (
                                <Notice
                                    type="warning"
                                    message="AAC format is not supported on web platforms. Please select WAV or OPUS instead."
                                />
                            )}
                        </View>

                        <View>
                            <Text variant="titleMedium" style={{ marginBottom: 8 }}>Output Sample Rate</Text>
                            <SegmentedButtons
                                value={outputSampleRate.toString()}
                                onValueChange={(value) => setOutputSampleRate(parseInt(value, 10) as SampleRate)}
                                buttons={[
                                    { value: '16000', label: '16 kHz' },
                                    { value: '44100', label: '44.1 kHz' },
                                    { value: '48000', label: '48 kHz' },
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

                        {renderStopped()}

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
                                
                                {trimResult.processingInfo && (
                                    <View style={{ marginTop: 8 }}>
                                        <Text variant="titleSmall">Processing</Text>
                                        <Text>Processing Time: {(trimResult.processingInfo.durationMs / 1000).toFixed(2)}s</Text>
                                    </View>
                                )}
                                
                                {/* Add playback controls */}
                                <View style={{ marginTop: 16, gap: 12 }}>
                                    <Text variant="titleSmall">Playback</Text>
                                    
                                    {/* Progress bar */}
                                    {sound && (
                                        <View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text>{(playbackPosition / 1000).toFixed(1)}s</Text>
                                                <Text>{(trimResult.durationMs / 1000).toFixed(1)}s</Text>
                                            </View>
                                            <ProgressBar 
                                                progress={trimResult.durationMs > 0 ? playbackPosition / trimResult.durationMs : 0} 
                                                color={colors.primary} 
                                            />
                                        </View>
                                    )}
                                    
                                    {/* Playback buttons */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
                                        {!sound ? (
                                            <Button 
                                                mode="contained" 
                                                onPress={playTrimmedAudio}
                                                icon="play"
                                            >
                                                Play Audio
                                            </Button>
                                        ) : (
                                            <>
                                                <Button 
                                                    mode="contained" 
                                                    onPress={togglePlayback}
                                                    icon={isPlaying ? "pause" : "play"}
                                                >
                                                    {isPlaying ? "Pause" : "Play"}
                                                </Button>
                                                <Button 
                                                    mode="outlined" 
                                                    onPress={stopPlayback}
                                                    icon="stop"
                                                >
                                                    Stop
                                                </Button>
                                            </>
                                        )}
                                    </View>
                                </View>
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
            </View>
        </ScreenWrapper>
    )
} 