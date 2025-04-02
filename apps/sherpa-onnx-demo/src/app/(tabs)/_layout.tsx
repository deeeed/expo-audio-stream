import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useColorScheme, Platform } from 'react-native';


function MaterialTabBarIcon(props: {
  name: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
}) {
  return <MaterialIcons size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isWeb = Platform.OS === 'web';

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
        name="asr"
        options={{
          title: 'Automatic Speech Recognition',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="hearing" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="audio-tagging"
        options={{
          title: 'Audio Tagging',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="music-note" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="speaker-id"
        options={{
          title: 'Speaker ID',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="web-test"
        options={{
          title: 'Web Tests',
          href: isWeb ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="code" size={size} color={color} />
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