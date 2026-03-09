import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ModelManagementProvider } from '../contexts/ModelManagement';
import { AgenticBridgeSync } from '../components/AgenticBridgeSync';
import '../agentic-bridge';

export default function RootLayout() {
  return (
    <ModelManagementProvider>
      <AgenticBridgeSync />
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            title: 'Sherpa-ONNX Demo'
          }}
        />
        <Stack.Screen
          name="feature"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </ModelManagementProvider>
  );
} 