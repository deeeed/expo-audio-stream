import { Canvas, useFont } from '@shopify/react-native-skia'
import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { DecibelMeter } from './DecibelMeter'

const RobotoRegular = require('../../assets/Roboto/Roboto-Regular.ttf')

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#1C1C1E',
    },
    canvas: {
        flex: 1,
    },
    wrapper: {
        overflow: 'hidden',
    },
})

interface DecibelMeterStoryProps
    extends React.ComponentProps<typeof DecibelMeter> {
    width: number
    height: number
}

const DecibelMeterStory = ({
    width,
    height,
    ...props
}: DecibelMeterStoryProps) => {
    const font = useFont(RobotoRegular, 10)

    if (!font) {
        return <ActivityIndicator />
    }

    return (
        <View style={[styles.wrapper, { width, height }]}>
            <Canvas style={styles.canvas}>
                <DecibelMeter
                    {...props}
                    width={width}
                    height={height}
                    font={font}
                />
            </Canvas>
        </View>
    )
}

const meta = {
    title: 'Audio UI/DecibelMeter',
    component: DecibelMeterStory,
    decorators: [
        (Story) => (
            <View style={styles.container}>
                <Story />
            </View>
        ),
    ],
} satisfies Meta<typeof DecibelMeter>

export default meta
type Story = StoryObj<typeof DecibelMeter>

export const VerticalMeter: Story = {
    args: {
        db: -30,
        width: 100,
        height: 300,
        orientation: 'vertical',
        minDb: -60,
        maxDb: 0,
    },
}

export const HorizontalMeter: Story = {
    args: {
        db: -30,
        width: 300,
        height: 100,
        orientation: 'horizontal',
        minDb: -60,
        maxDb: 0,
    },
}

export const CustomTheme: Story = {
    args: {
        db: -30,
        width: 100,
        height: 300,
        orientation: 'vertical',
        minDb: -60,
        maxDb: 0,
        theme: {
            backgroundColor: '#2C2C2E',
            meterWidth: 30,
            colors: {
                low: '#4CAF50',
                mid: '#FFC107',
                high: '#F44336',
            },
            ruler: {
                show: true,
                tickColor: '#FFFFFF',
                labelColor: '#FFFFFF',
                tickHeight: 8,
                labelFontSize: 12,
                interval: 20,
            },
        },
    },
}

export const AnimatedMeter: Story = {
    render: function Render() {
        const font = useFont(RobotoRegular, 10)
        const [db, setDb] = React.useState(-60)

        React.useEffect(() => {
            const interval = setInterval(() => {
                setDb((current) => {
                    if (current >= -10) return -60
                    return current + 5
                })
            }, 200)

            return () => clearInterval(interval)
        }, [])

        if (!font) {
            return <ActivityIndicator />
        }

        return (
            <View style={[styles.wrapper, { width: 100, height: 300 }]}>
                <Canvas style={styles.canvas}>
                    <DecibelMeter
                        db={db}
                        width={100}
                        height={300}
                        orientation="vertical"
                        minDb={-60}
                        maxDb={0}
                        font={font}
                    />
                </Canvas>
            </View>
        )
    },
}

export const NoRuler: Story = {
    args: {
        db: -30,
        width: 100,
        height: 300,
        orientation: 'vertical',
        minDb: -60,
        maxDb: 0,
        theme: {
            ruler: {
                show: false,
            },
        },
    },
}
