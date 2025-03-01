import { AppTheme, Button, useTheme } from '@siteed/design-system'
import React, { useMemo, useState } from 'react'
import { StyleSheet, View, ScrollView } from 'react-native'
import { SegmentedButtons, Text } from 'react-native-paper'

const getStyles = ({ theme }: { theme: AppTheme }) => 
    StyleSheet.create({
        container: {
            padding: theme.padding.s,
        },
        titleContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: theme.margin.s,
            gap: theme.margin.s,
        },
        title: {
            fontSize: 16,
            fontWeight: 'bold',
        },
        subtitle: {
            fontSize: 12,
            color: theme.colors.onSurfaceVariant,
        },
        buttonContainer: {
            marginTop: theme.margin.s,
        },
        scrollContent: {
            flexDirection: 'row',
            gap: theme.margin.s,
        }
    })

export type SegmentDuration = 10 | 100 | 1000 | 10000 | 30000 | 60000

interface SegmentDurationSelectorProps {
    value: SegmentDuration
    onChange: (duration: SegmentDuration) => void
    onConfirm?: () => void
    maxDurationMs?: number
    skipConfirmation?: boolean
    testID?: string
}

export function SegmentDurationSelector({ 
    value, 
    onChange,
    onConfirm,
    maxDurationMs,
    skipConfirmation = false,
    testID,
}: SegmentDurationSelectorProps) {
    const theme = useTheme()
    const styles = useMemo(() => getStyles({ theme }), [theme])
    const [selectedDuration, setSelectedDuration] = useState<SegmentDuration>(value)

    const buttons = useMemo(() => {
        const allButtons = [
            { value: '10', label: '0.01s' },
            { value: '100', label: '0.1s' },
            { value: '1000', label: '1s' },
            { value: '3000', label: '3s' },
            { value: '10000', label: '10s' },
            { value: '30000', label: '30s' },
            { value: '60000', label: '1min' },
        ]

        // Filter buttons based on maxDurationMs if provided
        return maxDurationMs 
            ? allButtons.filter(button => parseInt(button.value) <= maxDurationMs)
            : allButtons
    }, [maxDurationMs])

    const pointsPerSecond = (1000 / selectedDuration).toFixed(2)

    const handleValueChange = (newValue: string) => {
        const duration = parseInt(newValue) as SegmentDuration
        setSelectedDuration(duration)
        if (skipConfirmation) {
            onChange(duration)
            onConfirm?.()
        }
    }

    const handleConfirm = () => {
        onChange(selectedDuration)
        onConfirm?.()
    }

    return (
        <View style={styles.container} testID={testID}>
            <View style={styles.titleContainer}>
                <Text style={styles.title}>Segment Duration</Text>
                <Text style={styles.subtitle}>({pointsPerSecond} points/sec)</Text>
            </View>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <SegmentedButtons
                    value={selectedDuration.toString()}
                    onValueChange={handleValueChange}
                    buttons={buttons}
                />
            </ScrollView>
            {!skipConfirmation && selectedDuration !== value && (
                <View style={styles.buttonContainer}>
                    <Button 
                        mode="contained"
                        onPress={handleConfirm}
                    >
                        Apply New Duration
                    </Button>
                </View>
            )}
        </View>
    )
} 