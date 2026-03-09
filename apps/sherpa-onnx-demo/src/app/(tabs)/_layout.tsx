import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@siteed/design-system';
import { Tabs, useSegments } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { Platform, View } from 'react-native';

import { CustomHeader } from '../../components/CustomHeader';

const TAB_TITLES: Record<string, string> = {
  index: 'Home',
  features: 'Features',
  models: 'Models',
  about: 'About',
};

export default function TabLayout() {
  const { colors } = useTheme();
  const segments = useSegments();
  // Only show custom header for top-level tab screens (not when inside features stack)
  const isNestedFeature = segments.length > 2 && segments[1] === 'features';
  const currentTab = segments[1] ?? 'index';
  const title = TAB_TITLES[currentTab] ?? 'Sherpa-ONNX';

  if (Platform.OS === 'web') {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.text,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Ionicons name="home" size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="features"
          options={{
            title: 'Features',
            tabBarIcon: ({ color }) => <Ionicons name="grid" size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="models"
          options={{
            title: 'Models',
            tabBarIcon: ({ color }) => <Ionicons name="download" size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="about"
          options={{
            title: 'About',
            tabBarIcon: ({ color }) => <Ionicons name="information-circle" size={28} color={color} />,
          }}
        />
      </Tabs>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {!isNestedFeature && <CustomHeader title={title} />}
      <NativeTabs
        tintColor={colors.primary}
        backgroundColor={colors.background}
        labelVisibilityMode="labeled"
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'house', selected: 'house.fill' }}
            md="home"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="features">
          <NativeTabs.Trigger.Label>Features</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }}
            md="grid_view"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="models">
          <NativeTabs.Trigger.Label>Models</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'arrow.down.circle', selected: 'arrow.down.circle.fill' }}
            md="download"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="about">
          <NativeTabs.Trigger.Label>About</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'info.circle', selected: 'info.circle.fill' }}
            md="info"
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    </View>
  );
}
