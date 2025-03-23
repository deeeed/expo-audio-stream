import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ 
      headerShown: true,
      tabBarActiveTintColor: '#2196F3',
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Sherpa-ONNX Demo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tts"
        options={{
          title: 'Text-to-Speech',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
} 