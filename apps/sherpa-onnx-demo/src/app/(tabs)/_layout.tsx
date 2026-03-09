import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
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
        name="features"
        options={{
          title: 'Features',
          tabBarIcon: ({ color }) => <TabBarIcon name="grid" color={color} />,
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
