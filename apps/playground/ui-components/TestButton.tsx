import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface TestButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
}

export const TestButton: React.FC<TestButtonProps> = ({ 
  title, 
  onPress, 
  disabled = false 
}) => {
  return (
    <TouchableOpacity 
      style={[styles.button, disabled && styles.disabled]} 
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, disabled && styles.disabledText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

TestButton.displayName = 'TestButton';

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    backgroundColor: '#E5E5E7',
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    color: '#8E8E93',
  },
});