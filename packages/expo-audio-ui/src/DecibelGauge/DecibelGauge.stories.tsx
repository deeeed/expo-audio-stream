import { Canvas, useFont } from '@shopify/react-native-skia'
import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native'

import { DecibelGauge } from './DecibelGauge'

// Import the font file
const RobotoRegular = require('../../assets/Roboto/Roboto-Regular.ttf')

interface Styles {
    container: ViewStyle
    gaugeWrapper: ViewStyle
    row: ViewStyle
    gauge: ViewStyle
    label: TextStyle
}

const styles = StyleSheet.create<Styles>({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#1C1C1E',
    },
    gaugeWrapper: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row' as const,
        justifyContent: 'space-around' as const,
        width: '100%',
    },
    gauge: {
        alignItems: 'center' as const,
    },
    label: {
        color: '#FFFFFF',
        marginBottom: 10,
        fontSize: 16,
    },
})

const DecibelGaugeStory = (args: React.ComponentProps<typeof DecibelGauge>) => {
    const font = useFont(RobotoRegular, 14)

    if (!font) {
        return null
    }

    return (
        <Canvas style={{ width: 200, height: 60 }}>
            <DecibelGauge {...args} font={font} />
        </Canvas>
    )
}

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

// Simulated live audio levels
export const LiveAudio: Story = {
    render: () => {
        const [db, setDb] = React.useState(-60)
        const font = useFont(RobotoRegular, 14)

        React.useEffect(() => {
            const interval = setInterval(() => {
                const randomDb = Math.sin(Date.now() / 1000) * 30 - 30
                setDb(randomDb)
            }, 100)
            return () => clearInterval(interval)
        }, [])

        if (!font) return <ActivityIndicator />

        return (
            <View style={styles.container}>
                <View style={styles.row}>
                    <View style={styles.gauge}>
                        <Text style={styles.label}>Without Value</Text>
                        <Canvas style={{ width: 200, height: 60 }}>
                            <DecibelGauge db={db} font={font} />
                        </Canvas>
                    </View>
                    <View style={styles.gauge}>
                        <Text style={styles.label}>With Value</Text>
                        <Canvas style={{ width: 200, height: 60 }}>
                            <DecibelGauge
                                db={db}
                                showValue
                                font={font}
                                theme={{
                                    text: {
                                        color: '#FFFFFF',
                                        size: 16,
                                    },
                                }}
                            />
                        </Canvas>
                    </View>
                </View>
            </View>
        )
    },
}
