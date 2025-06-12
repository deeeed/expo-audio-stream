import { Canvas } from '@shopify/react-native-skia'
import type { Meta, StoryObj } from '@storybook/react-webpack5'
import React from 'react'
import { View } from 'react-native'

import { Waveform } from './Waveform'
import type { WaveformProps } from './Waveform'
import type { CandleData } from '../AudioVisualizer/AudioVisualiser.types'

const meta = {
    title: 'Components/Waveform',
    component: Waveform,
    decorators: [
        (Story) => (
            <View style={{ padding: 16, backgroundColor: '#f5f5f5' }}>
                <Story />
            </View>
        ),
    ],
} satisfies Meta<typeof Waveform>

export default meta
type Story = StoryObj<typeof Waveform>

function generateSineWave(length: number, frequency = 1): CandleData[] {
    return Array.from({ length }, (_, i) => {
        const amplitude =
            Math.sin((i * frequency * Math.PI) / length) * 0.5 + 0.5
        const rms = amplitude * 0.7071 // RMS for sine wave is amplitude / sqrt(2)
        const dB = 20 * Math.log10(Math.max(rms, 0.00001)) // Convert to dB, avoid log(0)

        return {
            amplitude,
            rms,
            dB,
            silent: amplitude < 0.01,
            visible: true,
            id: i,
        }
    })
}

function generateRandomWave(length: number): CandleData[] {
    return Array.from({ length }, (_, i) => {
        const amplitude = Math.random()
        const rms = amplitude * 0.7071 // Approximate RMS
        const dB = 20 * Math.log10(Math.max(rms, 0.00001)) // Convert to dB

        return {
            amplitude,
            rms,
            dB,
            silent: amplitude < 0.01,
            visible: true,
            id: i,
        }
    })
}

const WaveformStory = (args: WaveformProps) => (
    <Canvas style={{ width: args.canvasWidth, height: args.canvasHeight }}>
        <Waveform {...args} />
    </Canvas>
)

export const Default: Story = {
    render: WaveformStory,
    args: {
        activePoints: generateSineWave(50),
        canvasHeight: 200,
        canvasWidth: 400,
        minAmplitude: 0,
        maxAmplitude: 1,
    },
}

export const SmoothWaveform: Story = {
    render: WaveformStory,
    args: {
        ...Default.args,
        smoothing: true,
        theme: {
            color: '#2196F3',
            strokeWidth: 3,
        },
    },
}

export const HighFrequency: Story = {
    render: WaveformStory,
    args: {
        ...Default.args,
        activePoints: generateSineWave(50, 3),
        theme: {
            color: '#FF4081',
            strokeWidth: 2,
        },
    },
}

export const RandomWaveform: Story = {
    render: WaveformStory,
    args: {
        ...Default.args,
        activePoints: generateRandomWave(50),
        theme: {
            color: '#4CAF50',
            strokeWidth: 2,
        },
    },
}

const LiveWaveformComponent = (args: WaveformProps) => {
    const [activePoints, setActivePoints] = React.useState<CandleData[]>(
        generateSineWave(50)
    )

    React.useEffect(() => {
        const interval = setInterval(() => {
            setActivePoints((prevPoints) => {
                const newPoints = [...prevPoints.slice(1)]
                const amplitude = Math.random()
                const rms = amplitude * 0.7071
                const dB = 20 * Math.log10(Math.max(rms, 0.00001))

                newPoints.push({
                    amplitude,
                    rms,
                    dB,
                    silent: amplitude < 0.01,
                    visible: true,
                    id: prevPoints[prevPoints.length - 1].id + 1,
                })
                return newPoints
            })
        }, 50)

        return () => clearInterval(interval)
    }, [])

    return (
        <Canvas style={{ width: args.canvasWidth, height: args.canvasHeight }}>
            <Waveform {...args} activePoints={activePoints} />
        </Canvas>
    )
}

export const LiveWaveform: Story = {
    render: LiveWaveformComponent,
    args: {
        ...Default.args,
        theme: {
            color: '#9C27B0',
            strokeWidth: 2,
        },
    },
}
