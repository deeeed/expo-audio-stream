import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { AudioTimeRangeSelector } from './AudioTimeRangeSelector'

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#1C1C1E',
    },
    wrapper: {
        width: '100%',
        maxWidth: 500,
    },
})

const meta = {
    title: 'Audio UI/AudioTimeRangeSelector',
    component: AudioTimeRangeSelector,
    decorators: [
        (Story) => (
            <View style={styles.container}>
                <View style={styles.wrapper}>
                    <Story />
                </View>
            </View>
        ),
    ],
} satisfies Meta<typeof AudioTimeRangeSelector>

export default meta
type Story = StoryObj<typeof AudioTimeRangeSelector>

export const Default: Story = {
    args: {
        durationMs: 60000, // 1 minute
        startTime: 15000, // 15 seconds
        endTime: 45000, // 45 seconds
    },
}

export const CustomTheme: Story = {
    args: {
        durationMs: 60000,
        startTime: 15000,
        endTime: 45000,
        theme: {
            container: {
                backgroundColor: '#2C2C2E',
                height: 60,
                borderRadius: 12,
            },
            selectedRange: {
                backgroundColor: '#4CAF50',
                opacity: 0.7,
            },
            handle: {
                backgroundColor: '#4CAF50',
                width: 16,
            },
        },
    },
}

export const Disabled: Story = {
    args: {
        durationMs: 60000,
        startTime: 15000,
        endTime: 45000,
        disabled: true,
    },
}

export const InteractiveDemo: Story = {
    render: function Render() {
        const [range, setRange] = React.useState({ start: 15000, end: 45000 })

        return (
            <AudioTimeRangeSelector
                durationMs={60000}
                startTime={range.start}
                endTime={range.end}
                onRangeChange={(start, end) => setRange({ start, end })}
            />
        )
    },
}
