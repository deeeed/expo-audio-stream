import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ModelManagementProvider } from '../contexts/ModelManagement';

export default function RootLayout() {
  return (
    <ModelManagementProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false,
            title: 'Sherpa-ONNX Demo'
          }} 
        />
      </Stack>
    </ModelManagementProvider>
  );
} 