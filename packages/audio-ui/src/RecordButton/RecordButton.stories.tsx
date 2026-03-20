import type { Meta, StoryFn } from '@storybook/react-webpack5'
import React, { useState } from 'react'
import { View } from 'react-native'

import { RecordButton } from './RecordButton'

const meta: Meta<typeof RecordButton> = {
    title: 'UI/RecordButton',
    component: RecordButton,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        isRecording: {
            control: 'boolean',
            description: 'Controls the recording state of the button',
        },
        isProcessing: {
            control: 'boolean',
            description: 'Controls the processing state of the button',
        },
        onPress: { action: 'pressed' },
        styles: {
            control: 'object',
            description: 'Customization options for the button appearance',
            table: {
                type: {
                    summary: 'StyleProps',
                    detail: `{
                        size?: number;
                        backgroundColor?: string;
                        activeBackgroundColor?: string;
                        pulseColor?: string;
                        iconSize?: number;
                        iconColor?: string;
                        shadowProps?: {
                            color?: string;
                            offset?: { width: number; height: number };
                            opacity?: number;
                            radius?: number;
                        };
                    }`,
                },
            },
        },
    },
}

export default meta

const Template: StoryFn<typeof RecordButton> = (args) => (
    <View style={{ padding: 20 }}>
        <RecordButton {...args} />
    </View>
)

export const Default = Template.bind({})
Default.args = {
    isRecording: false,
    isProcessing: false,
}

export const Recording = Template.bind({})
Recording.args = {
    isRecording: true,
    isProcessing: false,
}

export const Processing = Template.bind({})
Processing.args = {
    isRecording: false,
    isProcessing: true,
}

export const Interactive: StoryFn<typeof RecordButton> = () => {
    const [isRecording, setIsRecording] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    const handlePress = () => {
        if (!isRecording && !isProcessing) {
            setIsRecording(true)
            // Simulate processing after 3 seconds of recording
            setTimeout(() => {
                setIsRecording(false)
                setIsProcessing(true)
                // Simulate processing completion after 2 seconds
                setTimeout(() => {
                    setIsProcessing(false)
                }, 2000)
            }, 3000)
        }
    }

    return (
        <View style={{ padding: 20 }}>
            <RecordButton
                isRecording={isRecording}
                isProcessing={isProcessing}
                onPress={handlePress}
            />
        </View>
    )
}
Interactive.parameters = {
    docs: {
        description: {
            story: 'An interactive example showing the complete recording flow with simulated processing.',
        },
    },
}

export const Customized = Template.bind({})
Customized.args = {
    isRecording: false,
    isProcessing: false,
    styles: {
        size: 100,
        backgroundColor: '#007AFF',
        activeBackgroundColor: '#0056B3',
        pulseColor: '#007AFF',
        iconSize: 40,
        iconColor: '#FFFFFF',
        shadowProps: {
            color: '#000000',
            opacity: 0.5,
            radius: 8,
            offset: {
                width: 0,
                height: 4,
            },
        },
    },
}
Customized.parameters = {
    docs: {
        description: {
            story: 'Example of a customized RecordButton with custom size, colors, and shadow properties.',
        },
    },
}

export const Small = Template.bind({})
Small.args = {
    isRecording: false,
    isProcessing: false,
    styles: {
        size: 48,
        iconSize: 24,
        shadowProps: {
            radius: 2,
            opacity: 0.2,
        },
    },
}
Small.parameters = {
    docs: {
        description: {
            story: 'A compact version of the RecordButton, suitable for smaller UI spaces or secondary recording actions.',
        },
    },
}
