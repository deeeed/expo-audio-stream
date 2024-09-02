import type { Meta } from '@storybook/react'
import React from 'react'

import { Test, TestProps } from './Test'

const TestMeta: Meta<TestProps> = {
    component: Test,
    tags: ['autodocs'],
    argTypes: {},
    args: {
        // data: 'test',
    },
}

export default TestMeta

export const Primary = (args: TestProps) => <Test {...args} />
