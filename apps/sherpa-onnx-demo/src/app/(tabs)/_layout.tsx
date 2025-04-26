import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, useColorScheme } from 'react-native';

/**
 * You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
 */
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#000',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="asr"
        options={{
          title: 'ASR',
          tabBarIcon: ({ color }) => <TabBarIcon name="mic" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tts"
        options={{
          title: 'TTS',
          tabBarIcon: ({ color }) => <TabBarIcon name="chatbox-ellipses" color={color} />,
        }}
      />
      <Tabs.Screen
        name="audio-tagging"
        options={{
          title: 'Audio Tagging',
          tabBarIcon: ({ color }) => <TabBarIcon name="musical-note" color={color} />,
        }}
      />
      <Tabs.Screen
        name="speaker-id"
        options={{
          title: 'Speaker ID',
          tabBarIcon: ({ color }) => <TabBarIcon name="person" color={color} />,
        }}
      />
      <Tabs.Screen
        name="models"
        options={{
          title: 'Models',
          tabBarIcon: ({ color }) => <TabBarIcon name="download" color={color} />,
        }}
      />
    </Tabs>
  );
} 