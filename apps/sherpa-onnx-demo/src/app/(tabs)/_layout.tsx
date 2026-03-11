import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@siteed/design-system';
import { Tabs, useSegments, useRouter } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { CustomHeader } from '../../components/CustomHeader';
import { useModelManagement } from '../../contexts/ModelManagement';

const TAB_TITLES: Record<string, string> = {
  index: 'Home',
  features: 'Features',
  models: 'Models',
  about: 'About',
};

const WEB_BANNER_KEY = 'sherpa-web-banner-dismissed';

function WebModeBanner() {
  const [dismissed, setDismissed] = useState(true); // hidden by default until we check

  useEffect(() => {
    try {
      const val = localStorage.getItem(WEB_BANNER_KEY);
      setDismissed(val === 'true');
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem(WEB_BANNER_KEY, 'true'); } catch {}
  }, []);

  if (dismissed) return null;

  return (
    <View style={bannerStyles.container}>
      <Text style={bannerStyles.text}>
        Running in web mode — features use built-in models only. Download the native app for full model selection.
      </Text>
      <Pressable onPress={handleDismiss} style={bannerStyles.closeButton}>
        <Text style={bannerStyles.closeText}>✕</Text>
      </Pressable>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    backgroundColor: '#E3F2FD',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  text: {
    flex: 1,
    color: '#1565C0',
    fontSize: 13,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
  closeText: {
    color: '#1565C0',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default function TabLayout() {
  const { colors } = useTheme();
  const segments = useSegments() as string[];
  const { modelsState } = useModelManagement();
  // Only show custom header for top-level tab screens (not when inside features stack)
  const isNestedFeature = segments.length > 2 && segments[1] === 'features';
  const currentTab = segments[1] ?? 'index';
  const title = TAB_TITLES[currentTab] ?? 'Sherpa-ONNX';
  const isAnyDownloading = Object.values(modelsState).some(
    s => s.status === 'downloading' || s.status === 'extracting'
  );

  const router = useRouter();

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1 }}>
        <WebModeBanner />
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
          listeners={{
            tabPress: (e) => {
              // If already inside a nested feature screen, pop to the features index
              if (isNestedFeature) {
                e.preventDefault();
                router.replace('/(tabs)/features');
              }
            },
          }}
        />
        <Tabs.Screen
          name="models"
          options={{
            href: null, // Models are preloaded on web — hide the tab
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
      </View>
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
          {isAnyDownloading && <NativeTabs.Trigger.Badge>↓</NativeTabs.Trigger.Badge>}
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
