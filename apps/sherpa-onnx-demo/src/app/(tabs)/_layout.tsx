import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export default function TabLayout() {
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
          title: 'Text to Speech',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="record-voice-over" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="models"
        options={{
          title: 'Models',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="storage" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
} 