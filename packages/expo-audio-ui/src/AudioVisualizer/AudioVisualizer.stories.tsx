/* eslint-disable react/prop-types */
import { FontAwesome } from '@expo/vector-icons'
import { useFont } from '@shopify/react-native-skia'
import { AudioAnalysis } from '@siteed/expo-audio-studio'
import { Meta, StoryFn } from '@storybook/react-webpack5'
import React from 'react'
import { Text, View } from 'react-native'

import { AudioVisualizer, AudioVisualizerProps } from './AudioVisualizer'
import { NavigationControlsProps } from '../NavigationControls/NavigationControls'

// Import the font files
const RobotoBold = require('../../assets/Roboto/Roboto-Bold.ttf')
const RobotoItalic = require('../../assets/Roboto/Roboto-Italic.ttf')
const RobotoRegular = require('../../assets/Roboto/Roboto-Regular.ttf')

const CustomNavigationControls: React.FC<NavigationControlsProps> = ({
    selectedCandle,
    selectedIndex,
    audioData,
    onPrev,
    onNext,
    onReset,
    theme,
}) => (
    <View
        style={[
            theme.navigationContainer,
            { backgroundColor: '#e0e0e0', padding: 10 },
        ]}
    >
        <Text style={theme.text}>{audioData.samples} samples (Custom)</Text>
        <View
            style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                width: '100%',
            }}
        >
            <View
                style={{
                    flexDirection: 'row',
                    gap: 10,
                    alignItems: 'center',
                }}
            >
                <FontAwesome
                    name="arrow-left"
                    size={24}
                    color={selectedCandle ? 'black' : 'gray'}
                    onPress={onPrev}
                />
                {selectedCandle ? (
                    <Text
                        style={theme.text}
                    >{`${selectedIndex + 1} / ${audioData.dataPoints.length}`}</Text>
                ) : (
                    <Text style={theme.text}>
                        {audioData.dataPoints.length} items
                    </Text>
                )}
                <FontAwesome
                    name="arrow-right"
                    size={24}
                    color={selectedCandle ? 'black' : 'gray'}
                    onPress={onNext}
                />
            </View>
            <FontAwesome name="times" size={24} color="red" onPress={onReset} />
        </View>
    </View>
)

export default {
    title: 'AudioVisualizer',
    component: AudioVisualizer,
    argTypes: {
        canvasHeight: { control: 'number' },
        candleWidth: { control: 'number' },
        candleSpace: { control: 'number' },
        showDottedLine: { control: 'boolean' },
        showRuler: { control: 'boolean' },
        showYAxis: { control: 'boolean' },
        showSilence: { control: 'boolean' },
        mode: { control: 'radio', options: ['static', 'live'] },
        playing: { control: 'boolean' },
        fontVariant: {
            control: 'select',
            options: ['Roboto-Regular', 'Roboto-Bold', 'Roboto-Italic', 'None'],
        },
        fontSize: { control: 'number' },
        enableInertia: { control: 'boolean' },
        disableTapSelection: { control: 'boolean' },
    },
} as Meta<AudioVisualizerProps>

// Mock audio data
const mockAudioData: AudioAnalysis = {
    pointsPerSecond: 10,
    durationMs: 60000, // 1 minute
    bitDepth: 16,
    samples: 2646000,
    numberOfChannels: 2,
    sampleRate: 44100,
    dataPoints: Array.from({ length: 600 }, (_, i) => ({
        id: i,
        amplitude: Math.random(),
        activeSpeech: Math.random() > 0.7,
        silent: Math.random() > 0.9,
    })),
    amplitudeAlgorithm: 'rms',
    amplitudeRange: { min: 0, max: 1 },
}

interface ExtendedAudioVisualizerProps extends AudioVisualizerProps {
    fontVariant: 'Roboto-Regular' | 'Roboto-Bold' | 'Roboto-Italic' | 'None'
    fontSize: number
}

const fontFiles = {
    'Roboto-Regular': RobotoRegular,
    'Roboto-Bold': RobotoBold,
    'Roboto-Italic': RobotoItalic,
}

const Template: StoryFn<ExtendedAudioVisualizerProps> = ({
    fontVariant,
    fontSize,
    ...args
}) => {
    const font = useFont(
        fontVariant !== 'None' ? fontFiles[fontVariant] : null,
        fontSize
    )

    if (fontVariant !== 'None' && !font) {
        return <div>Loading font...</div>
    }

    return <AudioVisualizer {...args} font={font ?? undefined} />
}

export const Default = Template.bind({})
Default.args = {
    audioData: mockAudioData,
    fontVariant: 'None',
    fontSize: 12,
    canvasHeight: 100,
    candleWidth: 2,
    candleSpace: 1,
    showDottedLine: false,
    showRuler: true,
    showYAxis: false,
    enableInertia: false,
    disableTapSelection: false,
}

export const LiveMode = Template.bind({})
LiveMode.args = {
    ...Default.args,
    mode: 'live',
    playing: true,
}

export const CompactView = Template.bind({})
CompactView.args = {
    ...Default.args,
    canvasHeight: 100,
    candleWidth: 2,
    candleSpace: 1,
    showDottedLine: false,
    showRuler: false,
    showYAxis: false,
}

export const CustomNavigationControlsStory = Template.bind({})
CustomNavigationControlsStory.args = {
    ...Default.args,
    NavigationControls: CustomNavigationControls,
    mode: 'static',
}

export const HighlightSpeech = Template.bind({})
HighlightSpeech.args = {
    ...Default.args,
    showSilence: false,
}

export const CustomColors = Template.bind({})
CustomColors.args = {
    ...Default.args,
    audioData: {
        ...mockAudioData,
        dataPoints: mockAudioData.dataPoints.map((point) => ({
            ...point,
            color: point.activeSpeech
                ? '#FF0000'
                : point.silent
                  ? '#CCCCCC'
                  : '#00FF00',
        })),
    },
}

export const LongAudio = Template.bind({})
LongAudio.args = {
    ...Default.args,
    audioData: {
        ...mockAudioData,
        durationMs: 3600000, // 1 hour
        dataPoints: Array.from({ length: 36000 }, (_, i) => ({
            id: i,
            amplitude: Math.random(),
            activeSpeech: Math.random() > 0.7,
            silent: Math.random() > 0.9,
        })),
    },
}

export const BoldFont = Template.bind({})
BoldFont.args = {
    ...Default.args,
    fontVariant: 'Roboto-Bold',
    fontSize: 14,
    showRuler: true,
}

export const NoFont = Template.bind({})
NoFont.args = {
    ...Default.args,
    fontVariant: 'None',
    showRuler: true,
    showYAxis: false,
}

export const WithInertia = Template.bind({})
WithInertia.args = {
    ...Default.args,
    enableInertia: true,
}

export const DisabledTapSelection = Template.bind({})
DisabledTapSelection.args = {
    ...Default.args,
    disableTapSelection: true,
}

// This story demonstrates the component's behavior when seeking through the audio
export const SeekingAudio: StoryFn<ExtendedAudioVisualizerProps> = ({
    fontVariant,
    fontSize,
    ...args
}) => {
    const [currentTime, setCurrentTime] = React.useState(0)
    const font = useFont(
        fontVariant !== 'None' ? fontFiles[fontVariant] : null,
        fontSize
    )

    const handleSeek = (newTime: number) => {
        setCurrentTime(newTime)
    }

    if (fontVariant !== 'None' && !font) {
        return <div>Loading font...</div>
    }

    return (
        <div>
            <AudioVisualizer
                {...args}
                font={font ?? undefined}
                currentTime={currentTime}
                onSeekEnd={handleSeek}
            />
            <input
                type="range"
                min={0}
                max={args.audioData.durationMs / 1000}
                value={currentTime}
                onChange={(e) => setCurrentTime(Number(e.target.value))}
                style={{ width: '100%', marginTop: '20px' }}
            />
        </div>
    )
}
SeekingAudio.args = {
    ...Default.args,
}

export const WithDecibelGauge = Template.bind({})
WithDecibelGauge.args = {
    ...Default.args,
    showDecibelVisualization: {
        type: 'gauge',
        position: 'top',
    },
}

export const WithDecibelMeter = Template.bind({})
WithDecibelMeter.args = {
    ...Default.args,
    showDecibelVisualization: {
        type: 'meter',
        position: 'bottom',
    },
}

export const CustomDecibelTheme = Template.bind({})
CustomDecibelTheme.args = {
    ...Default.args,
    showDecibelVisualization: {
        type: 'gauge',
        position: 'top',
    },
    theme: {
        decibelVisualization: {
            theme: {
                colors: {
                    low: '#00FF00',
                    mid: '#FFFF00',
                    high: '#FF0000',
                },
            },
        },
    },
}
