import { Canvas, useFont } from '@shopify/react-native-skia'
import { Meta, StoryFn } from '@storybook/react'
import React from 'react'
import { ActivityIndicator, View } from 'react-native'

import { SkiaTimeRuler, SkiaTimeRulerProps } from './SkiaTimeRuler'

const fontFiles = {
    'Roboto-Regular': require('../../assets/Roboto/Roboto-Regular.ttf'),
    'Roboto-Bold': require('../../assets/Roboto/Roboto-Bold.ttf'),
    'Roboto-Italic': require('../../assets/Roboto/Roboto-Italic.ttf'),
    'Roboto-Light': require('../../assets/Roboto/Roboto-Light.ttf'),
    'Roboto-Medium': require('../../assets/Roboto/Roboto-Medium.ttf'),
    'Roboto-Thin': require('../../assets/Roboto/Roboto-Thin.ttf'),
}

export default {
    title: 'Components/SkiaTimeRuler',
    component: SkiaTimeRuler,
    argTypes: {
        duration: { control: 'number' },
        width: { control: 'number' },
        interval: { control: 'number' },
        tickHeight: { control: 'number' },
        paddingLeft: { control: 'number' },
        tickColor: { control: 'color' },
        labelColor: { control: 'color' },
        labelFontSize: { control: 'number' },
        startMargin: { control: 'number' },
        fontVariant: {
            control: 'select',
            options: Object.keys(fontFiles),
        },
    },
} as Meta<SkiaTimeRulerProps>

const Template: StoryFn<
    SkiaTimeRulerProps & { fontVariant: keyof typeof fontFiles }
> = (args) => {
    const font = useFont(fontFiles[args.fontVariant], args.labelFontSize || 10)

    if (!font) {
        return <ActivityIndicator />
    }

    return (
        <View
            style={{
                width: args.width,
                height: 50,
                backgroundColor: '#e0e0e0',
            }}
        >
            <Canvas style={{ flex: 1 }}>
                <SkiaTimeRuler {...args} font={font} />
            </Canvas>
        </View>
    )
}

export const Default = Template.bind({})
Default.args = {
    duration: 300000, // 5 minutes in milliseconds
    width: 500,
    interval: 30, // 30 seconds
    tickHeight: 10,
    paddingLeft: 0,
    labelFontSize: 10,
    startMargin: 0,
    tickColor: '#000000', // Black ticks for better visibility
    labelColor: '#000000', // Black labels for better visibility
    fontVariant: 'Roboto-Regular',
}

export const LongerDuration = Template.bind({})
LongerDuration.args = {
    ...Default.args,
    duration: 3600000, // 1 hour in milliseconds
    interval: 300, // 5 minutes
}

export const CustomColors = Template.bind({})
CustomColors.args = {
    ...Default.args,
    tickColor: '#FF0000', // Red ticks
    labelColor: '#0000FF', // Blue labels
    fontVariant: 'Roboto-Bold',
}

export const LargerFont = Template.bind({})
LargerFont.args = {
    ...Default.args,
    labelFontSize: 14,
    fontVariant: 'Roboto-Medium',
}

export const CustomFormatter: StoryFn<
    SkiaTimeRulerProps & { fontVariant: keyof typeof fontFiles }
> = (args) => {
    const font = useFont(fontFiles[args.fontVariant], args.labelFontSize || 10)
    const customFormatter = (seconds: number) => `${(seconds / 60).toFixed(1)}m`

    if (!font) {
        return <ActivityIndicator />
    }

    return (
        <View
            style={{
                width: args.width,
                height: 50,
                backgroundColor: '#e0e0e0',
            }}
        >
            <Canvas style={{ flex: 1 }}>
                <SkiaTimeRuler
                    {...args}
                    font={font}
                    labelFormatter={customFormatter}
                />
            </Canvas>
        </View>
    )
}
CustomFormatter.args = {
    ...Default.args,
    labelColor: '#006400', // Dark green labels for better visibility
    fontVariant: 'Roboto-Italic',
}

export const WithPaddingAndMargin = Template.bind({})
WithPaddingAndMargin.args = {
    ...Default.args,
    paddingLeft: 20,
    startMargin: 10,
    fontVariant: 'Roboto-Light',
}
