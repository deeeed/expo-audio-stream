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
        alignItems: 'center',
        justifyContent: 'center',
        height: 400, // Explicit height for Storybook canvas
    },
    gaugeWrapper: {
        marginBottom: 16,
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    gauge: {
        alignItems: 'center',
    },
    label: {
        color: '#FFFFFF',
        marginBottom: 10,
        fontSize: 16,
    },
})

const _DecibelGaugeStory = (
    args: React.ComponentProps<typeof DecibelGauge>
) => {
    const font = useFont(RobotoRegular, 14)

    if (!font) {
        return (
            <View style={styles.container}>
                <Text>Loading font...</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <View style={styles.gaugeWrapper}>
                <DecibelGauge {...args} font={font} />
            </View>
        </View>
    )
}

export default {
    title: 'DecibelGauge',
    component: DecibelGauge,
    parameters: {
        layout: 'centered',
        // This ensures the component renders with proper dimensions
        viewport: {
            defaultViewport: 'mobile1',
        },
    },
    // Add a decorator to ensure proper rendering environment
    decorators: [
        (Story) => (
            <View
                style={{
                    flex: 1,
                    backgroundColor: '#1C1C1E',
                    padding: 16,
                    minHeight: 400,
                }}
            >
                <Story />
            </View>
        ),
    ],
} as Meta<typeof DecibelGauge>

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
                needle: '#00FF00',
                progress: '#FFFF00',
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
                                needle: '#34C759',
                                progress: '#34C759',
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
                                needle: '#FFD60A',
                                progress: '#FFD60A',
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
                                needle: '#FF453A',
                                progress: '#FF453A',
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
    render: function LiveAudioStory() {
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
            <View style={[styles.container, { height: 500 }]}>
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
    parameters: {
        // Override default parameters if needed
        layout: 'fullscreen',
    },
}

// Add a new story for different sizes
export const DifferentSizes: Story = {
    render: function DifferentSizesStory() {
        const font = useFont(RobotoRegular, 14)

        if (!font) return <ActivityIndicator />

        return (
            <View style={styles.container}>
                <View style={styles.row}>
                    <View style={styles.gauge}>
                        <Text style={styles.label}>Small</Text>
                        <Canvas style={{ width: 100, height: 60 }}>
                            <DecibelGauge
                                db={-30}
                                theme={{
                                    size: {
                                        width: 100,
                                        height: 60,
                                        radius: 20,
                                    },
                                    strokeWidth: 8,
                                }}
                                font={font}
                            />
                        </Canvas>
                    </View>
                    <View style={styles.gauge}>
                        <Text style={styles.label}>Medium</Text>
                        <Canvas style={{ width: 200, height: 120 }}>
                            <DecibelGauge
                                db={-30}
                                theme={{
                                    size: {
                                        width: 200,
                                        height: 120,
                                        radius: 40,
                                    },
                                }}
                                font={font}
                            />
                        </Canvas>
                    </View>
                    <View style={styles.gauge}>
                        <Text style={styles.label}>Large</Text>
                        <Canvas style={{ width: 300, height: 180 }}>
                            <DecibelGauge
                                db={-30}
                                theme={{
                                    size: {
                                        width: 300,
                                        height: 180,
                                        radius: 60,
                                    },
                                    strokeWidth: 15,
                                }}
                                font={font}
                            />
                        </Canvas>
                    </View>
                </View>
            </View>
        )
    },
}
