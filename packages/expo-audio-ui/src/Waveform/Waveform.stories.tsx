import { Canvas } from '@shopify/react-native-skia'
import { Meta, StoryFn } from '@storybook/react'
import React from 'react'

import Waveform, { WaveformProps } from './Waveform'
import { CandleData } from '../AudioVisualizer/AudioVisualiser.types'

export default {
    title: 'Components/Waveform',
    component: Waveform,
    argTypes: {
        activePoints: { control: 'object' },
        canvasHeight: { control: 'number' },
        canvasWidth: { control: 'number' },
        minAmplitude: { control: 'number' },
        maxAmplitude: { control: 'number' },
        theme: { control: 'object' },
    },
} as Meta<typeof Waveform>

const sampleActivePoints: CandleData[] = Array.from({ length: 50 }, (_, i) => ({
    amplitude: Math.sin(i / 10) * 0.5 + 0.5, // Generate sample waveform data
    visible: true,
    id: i,
}))

const Template: StoryFn<WaveformProps> = (args) => (
    <Canvas style={{ width: args.canvasWidth, height: args.canvasHeight }}>
        <Waveform {...args} />
    </Canvas>
)

export const Default = Template.bind({})
Default.args = {
    activePoints: sampleActivePoints,
    canvasHeight: 200,
    canvasWidth: 400,
    minAmplitude: 0,
    maxAmplitude: 1,
}

export const CustomColor = Template.bind({})
CustomColor.args = {
    ...Default.args,
    theme: {
        waveformColor: 'green',
    },
}

export const LargeWaveform = Template.bind({})
LargeWaveform.args = {
    ...Default.args,
    canvasHeight: 300,
    canvasWidth: 600,
}

export const DynamicData: StoryFn<WaveformProps> = (args) => {
    const [activePoints, setActivePoints] =
        React.useState<CandleData[]>(sampleActivePoints)

    React.useEffect(() => {
        const interval = setInterval(() => {
            setActivePoints((prevPoints) => {
                const newId =
                    prevPoints.length > 0
                        ? prevPoints[prevPoints.length - 1].id + 1
                        : 0
                const newPoint: CandleData = {
                    amplitude: Math.random(),
                    visible: true,
                    id: newId,
                }
                return [...prevPoints.slice(1), newPoint]
            })
        }, 100)

        return () => clearInterval(interval)
    }, [])

    return (
        <Canvas style={{ width: args.canvasWidth, height: args.canvasHeight }}>
            <Waveform
                activePoints={activePoints}
                canvasHeight={args.canvasHeight}
                canvasWidth={args.canvasWidth}
                minAmplitude={args.minAmplitude}
                maxAmplitude={args.maxAmplitude}
                theme={args.theme}
            />
        </Canvas>
    )
}

DynamicData.args = {
    ...Default.args,
}
