import type { Meta } from '@storybook/react'
import React from 'react'

import { Circles, CirclesProps } from './Circles'

const HelloWorldMeta: Meta<CirclesProps> = {
    component: Circles,
    // tags: ['autodocs'],
    argTypes: {},
    args: {
        size: 200,
    },
}

export default HelloWorldMeta

export const Primary = (args: CirclesProps) => <Circles {...args} />
