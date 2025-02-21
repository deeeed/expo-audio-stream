import { AppTheme, Button, useTheme } from '@siteed/design-system'
import React, { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
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
        }
    })

export type SegmentDuration = 10 | 100 | 1000 | 10000

interface SegmentDurationSelectorProps {
    value: SegmentDuration
    onChange: (duration: SegmentDuration) => void
    onConfirm?: () => void
}

export function SegmentDurationSelector({ 
    value, 
    onChange,
    onConfirm 
}: SegmentDurationSelectorProps) {
    const theme = useTheme()
    const styles = useMemo(() => getStyles({ theme }), [theme])
    const [selectedDuration, setSelectedDuration] = useState<SegmentDuration>(value)

    const buttons = [
        { value: '10', label: '10ms' },
        { value: '100', label: '100ms' },
        { value: '1000', label: '1s' },
        { value: '10000', label: '10s' },
    ]

    const pointsPerSecond = (1000 / selectedDuration).toFixed(2)

    const handleConfirm = () => {
        onChange(selectedDuration)
        onConfirm?.()
    }

    return (
        <View style={styles.container}>
            <View style={styles.titleContainer}>
                <Text style={styles.title}>Segment Duration</Text>
                <Text style={styles.subtitle}>({pointsPerSecond} points/sec)</Text>
            </View>
            <SegmentedButtons
                value={selectedDuration.toString()}
                onValueChange={(value) => setSelectedDuration(parseInt(value) as SegmentDuration)}
                buttons={buttons}
            />
            {selectedDuration !== value && (
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