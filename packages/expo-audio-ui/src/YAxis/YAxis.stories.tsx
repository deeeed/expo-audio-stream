import { Canvas, useFont } from '@shopify/react-native-skia'
import { Meta, StoryFn } from '@storybook/react'
import React from 'react'
import { ActivityIndicator, View } from 'react-native'

import { YAxis, YAxisProps } from './YAxis'

// Import the Roboto font
const RobotoRegular = require('../../assets/Roboto/Roboto-Regular.ttf')

export default {
    title: 'Components/YAxis',
    component: YAxis,
    argTypes: {
        canvasHeight: { control: 'number' },
        canvasWidth: { control: 'number' },
        minAmplitude: { control: 'number' },
        maxAmplitude: { control: 'number' },
        padding: { control: 'number' },
        tickInterval: { control: 'number' },
        tickLength: { control: 'number' },
        tickColor: { control: 'color' },
        labelColor: { control: 'color' },
        labelFontSize: { control: 'number' },
    },
} as Meta

const Template: StoryFn<YAxisProps> = (args) => {
    const font = useFont(RobotoRegular, args.labelFontSize)

    if (!font) {
        return <ActivityIndicator />
    }

    return (
        <View
            style={{
                width: args.canvasWidth,
                height: args.canvasHeight,
                backgroundColor: '#f0f0f0',
            }}
        >
            <Canvas style={{ flex: 1 }}>
                <YAxis {...args} font={font} />
            </Canvas>
        </View>
    )
}

export const Default = Template.bind({})
Default.args = {
    canvasHeight: 300,
    canvasWidth: 100,
    minAmplitude: 0,
    maxAmplitude: 1,
    padding: 20,
    tickInterval: 0.1,
    tickLength: 10,
    labelFontSize: 10,
    tickColor: '#000000', // Black ticks
    labelColor: '#000000', // Black labels
}

export const CustomColors = Template.bind({})
CustomColors.args = {
    ...Default.args,
    tickColor: '#FF0000', // Red ticks
    labelColor: '#0000FF', // Blue labels
}

export const MoreTicks = Template.bind({})
MoreTicks.args = {
    ...Default.args,
    tickInterval: 0.05,
}

export const LargerFont = Template.bind({})
LargerFont.args = {
    ...Default.args,
    labelFontSize: 14,
}

export const CustomRange = Template.bind({})
CustomRange.args = {
    ...Default.args,
    minAmplitude: -1,
    maxAmplitude: 1,
}

export const CustomFormatter: StoryFn<YAxisProps> = (args) => {
    const font = useFont(RobotoRegular, args.labelFontSize)
    const customFormatter = (value: number) => `${(value * 100).toFixed(0)}%`

    if (!font) {
        return <ActivityIndicator />
    }

    return (
        <View
            style={{
                width: args.canvasWidth,
                height: args.canvasHeight,
                backgroundColor: '#f0f0f0',
            }}
        >
            <Canvas style={{ flex: 1 }}>
                <YAxis {...args} font={font} labelFormatter={customFormatter} />
            </Canvas>
        </View>
    )
}
CustomFormatter.args = {
    ...Default.args,
    labelColor: '#008000', // Green labels for the custom formatter
}
