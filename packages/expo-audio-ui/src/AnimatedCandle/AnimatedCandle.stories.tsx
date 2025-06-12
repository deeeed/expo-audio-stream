import { Canvas } from '@shopify/react-native-skia'
import { Meta, StoryFn } from '@storybook/react-webpack5'
import React from 'react'

import AnimatedCandle, { AnimatedCandleProps } from './AnimatedCandle'

export default {
    title: 'Components/AnimatedCandle',
    component: AnimatedCandle,
    argTypes: {
        height: { control: 'number' },
        x: { control: 'number' },
        y: { control: 'number' },
        startY: { control: 'number' },
        width: { control: 'number' },
        color: { control: 'color' },
        animated: { control: 'boolean' },
    },
} as Meta

const Template: StoryFn<AnimatedCandleProps> = (args) => (
    <Canvas style={{ width: 300, height: 300 }}>
        <AnimatedCandle {...args} />
    </Canvas>
)

export const Default = Template.bind({})
Default.args = {
    height: 100,
    x: 50,
    y: 150,
    startY: 250,
    width: 20,
    color: 'red',
    animated: true,
}

export const Static = Template.bind({})
Static.args = {
    ...Default.args,
    animated: false,
}

export const TallCandle = Template.bind({})
TallCandle.args = {
    ...Default.args,
    height: 200,
    y: 50,
}

export const WideCandle = Template.bind({})
WideCandle.args = {
    ...Default.args,
    width: 40,
}

export const CustomColor = Template.bind({})
CustomColor.args = {
    ...Default.args,
    color: '#00ff00',
}

export const MultipleCandles: StoryFn = () => (
    <Canvas style={{ width: 300, height: 300 }}>
        <AnimatedCandle
            height={100}
            x={50}
            y={150}
            startY={250}
            width={20}
            color="red"
        />
        <AnimatedCandle
            height={150}
            x={100}
            y={100}
            startY={250}
            width={20}
            color="blue"
        />
        <AnimatedCandle
            height={80}
            x={150}
            y={170}
            startY={250}
            width={20}
            color="green"
        />
    </Canvas>
)
