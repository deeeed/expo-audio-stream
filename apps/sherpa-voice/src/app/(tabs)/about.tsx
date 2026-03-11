import { Ionicons } from '@expo/vector-icons';
import { Text, useTheme , ScreenWrapper } from '@siteed/design-system';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';

const LINKS = [
  {
    label: 'GitHub Repository',
    icon: 'logo-github' as const,
    url: 'https://github.com/deeeed/expo-audio-stream',
    description: 'Star or fork the project',
  },
  {
    label: 'Sponsor on GitHub',
    icon: 'heart' as const,
    url: 'https://github.com/sponsors/deeeed',
    description: 'Support this work',
  },
  {
    label: '@deeeed on GitHub',
    icon: 'person' as const,
    url: 'https://github.com/deeeed',
    description: 'More projects from Arthur Breton',
  },
  {
    label: 'siteed.net',
    icon: 'globe' as const,
    url: 'https://siteed.net',
    description: 'React Native tools & libraries',
  },
];

function LinkRow({ label, icon, url, description }: typeof LINKS[0]) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[styles.linkRow, { backgroundColor: theme.colors.surface, borderRadius: theme.roundness * 2 }]}
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.7}
    >
      <View style={[styles.linkIcon, { backgroundColor: theme.colors.primaryContainer }]}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
      </View>
      <View style={styles.linkContent}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>{label}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{description}</Text>
      </View>
      <Ionicons name="open-outline" size={16} color={theme.colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}

export default function AboutScreen() {
  const theme = useTheme();
  const version = Constants.expoConfig?.version ?? '0.1.0';

  return (
    <ScreenWrapper useInsets={false} contentContainerStyle={{ padding: theme.padding.m }}>
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: theme.colors.primary, borderRadius: theme.roundness * 3 }]}>
        <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="mic" size={40} color="#fff" />
        </View>
        <Text variant="headlineSmall" style={{ color: '#fff', fontWeight: 'bold', marginBottom: 4 }}>
          Sherpa Voice
        </Text>
        <Text variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.8)' }}>
          v{version}
        </Text>
      </View>

      {/* GitHub Star CTA */}
      <TouchableOpacity
        style={[styles.starCard, { backgroundColor: theme.colors.surface, borderRadius: theme.roundness * 2, borderColor: theme.colors.primary }]}
        onPress={() => Linking.openURL('https://github.com/deeeed/expo-audio-stream')}
        activeOpacity={0.7}
      >
        <Ionicons name="star" size={24} color={theme.colors.primary} />
        <View style={{ flex: 1 }}>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
            Star on GitHub
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Help others discover this project
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={theme.colors.primary} />
      </TouchableOpacity>

      {/* About */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.roundness * 2 }]}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 22, marginBottom: 12 }}>
          I built this to make on-device ML accessible to React Native developers. No cloud, no internet required — speech recognition, TTS, speaker ID and more, running entirely on your device.
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 22 }}>
          Powered by{' '}
          <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '600' }}>sherpa-onnx</Text>
          {' '}and the{' '}
          <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '600' }}>expo-audio-stream</Text>
          {' '}monorepo.
        </Text>
      </View>

      {/* Author */}
      <View style={[styles.authorRow, { borderColor: theme.colors.outlineVariant }]}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text variant="titleLarge" style={{ color: theme.colors.primary }}>A</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>Arthur Breton</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>@deeeed · siteed.net</Text>
        </View>
      </View>

      {/* Links */}
      <Text variant="titleSmall" style={{ color: theme.colors.onSurface, marginBottom: 8, marginTop: 4 }}>
        Links
      </Text>
      {LINKS.map(link => (
        <LinkRow key={link.url} {...link} />
      ))}

      {/* Platform info */}
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 24 }}>
        {Platform.OS} · sherpa-onnx v1.12.28
      </Text>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  card: {
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkContent: {
    flex: 1,
  },
});
