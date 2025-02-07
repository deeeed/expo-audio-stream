import { Canvas } from '@shopify/react-native-skia'
import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { View } from 'react-native'

import { DecibelGauge } from './DecibelGauge'

const styles = {
    container: {
        padding: 16,
        backgroundColor: '#000',
    },
    gaugeWrapper: {
        marginBottom: 16,
    },
}

const DecibelGaugeStory = (args: React.ComponentProps<typeof DecibelGauge>) => (
    <Canvas style={{ width: 200, height: 60 }}>
        <DecibelGauge {...args} />
    </Canvas>
)

const meta = {
    title: 'Audio UI/DecibelGauge',
    component: DecibelGaugeStory,
    decorators: [
        (Story) => (
            <View style={styles.container}>
                <Story />
            </View>
        ),
    ],
} satisfies Meta<typeof DecibelGauge>

export default meta
type Story = StoryObj<typeof DecibelGauge>

// Basic usage - only needs db value
export const Default: Story = {
    args: {
        db: -30,
    },
}

// Custom theme example
export const CustomTheme: Story = {
    args: {
        db: -20,
        theme: {
            colors: {
                low: '#00FF00',
                mid: '#FFFF00',
                high: '#FF0000',
            },
            strokeWidth: 15,
        },
    },
}

// Multiple ranges example
export const MultipleRanges: Story = {
    render: () => (
        <>
            <View style={styles.gaugeWrapper}>
                <Canvas style={{ width: 200, height: 60 }}>
                    <DecibelGauge
                        db={-50}
                        theme={{
                            minDb: -60,
                            maxDb: -40,
                            colors: {
                                low: '#34C759',
                                mid: '#34C759',
                                high: '#34C759',
                            },
                        }}
                    />
                </Canvas>
            </View>
            <View style={styles.gaugeWrapper}>
                <Canvas style={{ width: 200, height: 60 }}>
                    <DecibelGauge
                        db={-30}
                        theme={{
                            minDb: -40,
                            maxDb: -20,
                            colors: {
                                low: '#FFD60A',
                                mid: '#FFD60A',
                                high: '#FFD60A',
                            },
                        }}
                    />
                </Canvas>
            </View>
            <View style={styles.gaugeWrapper}>
                <Canvas style={{ width: 200, height: 60 }}>
                    <DecibelGauge
                        db={-10}
                        theme={{
                            minDb: -20,
                            maxDb: 0,
                            colors: {
                                low: '#FF453A',
                                mid: '#FF453A',
                                high: '#FF453A',
                            },
                        }}
                    />
                </Canvas>
            </View>
        </>
    ),
}
