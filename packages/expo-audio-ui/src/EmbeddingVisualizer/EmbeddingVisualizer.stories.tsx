/* eslint-disable react/prop-types */
import { Meta, StoryFn } from '@storybook/react-webpack5'
import React from 'react'
import { View } from 'react-native'

import {
    EmbeddingVisualizer,
    EmbeddingVisualizerProps,
} from './EmbeddingVisualizer'

// Mock embeddings data for demonstration
const generateMockEmbeddings = (
    numEmbeddings: number,
    embeddingLength: number
): number[][] => {
    return Array.from({ length: numEmbeddings }, () =>
        Array.from({ length: embeddingLength }, () => Math.random())
    )
}

const mockEmbeddings = generateMockEmbeddings(1, 100) // Single embedding with 100 dimensions

export default {
    title: 'Components/EmbeddingVisualizer',
    component: EmbeddingVisualizer,
    argTypes: {
        width: { control: { type: 'number', min: 100, max: 1000, step: 50 } },
        height: { control: { type: 'number', min: 100, max: 1000, step: 50 } },
        embeddings: { control: 'object' },
        style: { control: 'object' },
    },
} as Meta<EmbeddingVisualizerProps>

const Template: StoryFn<EmbeddingVisualizerProps> = (args) => (
    <View style={{ padding: 20 }}>
        <EmbeddingVisualizer {...args} />
    </View>
)

export const Default = Template.bind({})
Default.args = {
    embeddings: mockEmbeddings,
    width: 300,
    height: 300,
}

export const MultipleEmbeddings = Template.bind({})
MultipleEmbeddings.args = {
    embeddings: generateMockEmbeddings(3, 100), // Three embeddings with 100 dimensions each
    width: 300,
    height: 600,
}

export const LargeEmbedding = Template.bind({})
LargeEmbedding.args = {
    embeddings: generateMockEmbeddings(1, 1000), // Single embedding with 1000 dimensions
    width: 400,
    height: 400,
}

export const CustomSize = Template.bind({})
CustomSize.args = {
    embeddings: mockEmbeddings,
    width: 500,
    height: 200,
}

export const StyledEmbeddingVisualizer = Template.bind({})
StyledEmbeddingVisualizer.args = {
    embeddings: mockEmbeddings,
    width: 300,
    height: 300,
    style: {
        borderWidth: 2,
        borderColor: 'black',
        borderRadius: 10,
    },
}
