import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ModelManagementProvider } from '../contexts/ModelManagement';

export default function RootLayout() {
  return (
    <ModelManagementProvider>
      <Stack>
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false 
          }} 
        />
      </Stack>
    </ModelManagementProvider>
  );
} 