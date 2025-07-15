import type { Meta, StoryObj } from '@storybook/react';
import { TestButton } from './TestButton';

const meta: Meta<typeof TestButton> = {
  title: 'TestButton',
  component: TestButton,
  argTypes: {
    onPress: { action: 'pressed' },
  },
  args: {
    title: 'Test Button',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const LongText: Story = {
  args: {
    title: 'This is a very long button text',
  },
};

// For React Native, use simple visual testing and actions
export const Interactive: Story = {
  args: {
    title: 'Click me!',
    onPress: () => {
      // This will show up in the Actions panel
      console.log('Button pressed!');
    },
  },
};