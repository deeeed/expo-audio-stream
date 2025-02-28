import React from 'react'
import { View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { TimeRange } from '@siteed/expo-audio-stream'

interface TrimVisualizationProps {
    durationMs: number
    mode: 'single' | 'keep' | 'remove'
    startTime: number
    endTime: number
    ranges: (TimeRange & { id: string })[] // Extending TimeRange with id for UI purposes
}

const TrimVisualization: React.FC<TrimVisualizationProps> = ({ 
    durationMs, 
    mode, 
    startTime, 
    endTime, 
    ranges 
}) => {
    const theme = useTheme()
    const colors = theme.colors
    
    // Calculate segments that will be kept (true) or removed (false)
    const calculateSegments = () => {
        // Create an array representing the entire audio file
        // Each element represents a small segment of time
        const segments = []
        const segmentCount = 100 // Number of segments to divide the audio into
        const segmentDuration = durationMs / segmentCount
        
        if (mode === 'single') {
            // For single mode, we keep only what's between start and end time
            for (let i = 0; i < segmentCount; i++) {
                const segmentStart = i * segmentDuration
                const segmentEnd = (i + 1) * segmentDuration
                const isKept = segmentStart >= startTime && segmentEnd <= endTime
                segments.push(isKept)
            }
        } else if (mode === 'keep') {
            // For keep mode, we only keep what's in the ranges
            for (let i = 0; i < segmentCount; i++) {
                const segmentStart = i * segmentDuration
                const segmentEnd = (i + 1) * segmentDuration
                
                // Check if this segment overlaps with any of the ranges
                const isKept = ranges.some(range => 
                    // Check for any overlap between segment and range
                    (segmentStart <= range.endTimeMs && segmentEnd >= range.startTimeMs)
                )
                segments.push(isKept)
            }
        } else if (mode === 'remove') {
            // For remove mode, we keep everything except what's in the ranges
            for (let i = 0; i < segmentCount; i++) {
                const segmentStart = i * segmentDuration
                const segmentEnd = (i + 1) * segmentDuration
                
                // Check if this segment overlaps with any of the ranges
                const isInRange = ranges.some(range => 
                    // Check for any overlap between segment and range
                    (segmentStart <= range.endTimeMs && segmentEnd >= range.startTimeMs)
                )
                segments.push(!isInRange) // Keep if NOT in range
            }
        }
        
        return segments
    }
    
    const segments = calculateSegments()
    
    // Calculate the final duration after trimming
    const calculateFinalDuration = () => {
        if (mode === 'single') {
            return endTime - startTime
        } else {
            // Count kept segments and multiply by segment duration
            const keptSegments = segments.filter(isKept => isKept).length
            return (keptSegments / segments.length) * durationMs
        }
    }
    
    const finalDuration = calculateFinalDuration()
    const percentageKept = Math.round((finalDuration / durationMs) * 100)
    
    // Generate time markers (every 10% of duration)
    const timeMarkers = Array.from({ length: 11 }, (_, i) => {
        const timeMs = (durationMs * i) / 10
        return {
            position: i * 10, // percentage position
            label: (timeMs / 1000).toFixed(1) + 's'
        }
    })
    
    return (
        <View style={{ backgroundColor: colors.surfaceVariant, padding: 16, borderRadius: 8 }}>
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>Trim Preview</Text>
            
            <View style={{ marginBottom: 16 }}>
                <Text style={{ marginBottom: 4 }}>
                    {(durationMs / 1000).toFixed(1)}s → {(finalDuration / 1000).toFixed(1)}s ({percentageKept}% kept)
                </Text>
                <View style={{ height: 24, backgroundColor: colors.surfaceVariant, borderRadius: 4, overflow: 'hidden', flexDirection: 'row' }}>
                    {segments.map((isKept, index) => (
                        <View 
                            key={index} 
                            style={{ 
                                flex: 1, 
                                height: '100%', 
                                backgroundColor: isKept ? colors.primary : colors.error + '40',
                            }} 
                        />
                    ))}
                </View>
                
                {/* Time markers */}
                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                    {timeMarkers.map((marker, index) => (
                        <View 
                            key={index} 
                            style={{ 
                                position: 'absolute', 
                                left: `${marker.position}%`, 
                                transform: [{ translateX: -4 }]
                            }}
                        >
                            <Text variant="bodySmall" style={{ color: colors.outline, fontSize: 10 }}>
                                {marker.label}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
            
            <Text variant="bodySmall" style={{ color: colors.outline }}>
                {mode === 'single' 
                    ? `Keeping audio from ${(startTime / 1000).toFixed(1)}s to ${(endTime / 1000).toFixed(1)}s` 
                    : mode === 'keep' 
                        ? `Keeping ${ranges.length} selected range${ranges.length !== 1 ? 's' : ''}` 
                        : `Removing ${ranges.length} selected range${ranges.length !== 1 ? 's' : ''}`}
            </Text>
        </View>
    )
}

export default TrimVisualization 