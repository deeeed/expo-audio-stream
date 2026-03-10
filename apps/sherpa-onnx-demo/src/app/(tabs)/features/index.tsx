import { Ionicons } from '@expo/vector-icons';
import { Text, useTheme } from '@siteed/design-system';
import type { AppTheme } from '@siteed/design-system';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScreenWrapper } from '@siteed/design-system';
import { isWebFeatureRouteEnabled } from '../../../config/webFeatures';


interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  route: string;
  color: string;
}

const FEATURES: FeatureCardProps[] = [
  {
    title: 'Speech Recognition',
    description: 'Convert speech to text using file or live microphone input',
    icon: 'mic',
    route: '/(tabs)/features/asr',
    color: '#4CAF50',
  },
  {
    title: 'Text-to-Speech',
    description: 'Convert text to natural-sounding speech',
    icon: 'chatbox-ellipses',
    route: '/(tabs)/features/tts',
    color: '#2196F3',
  },
  {
    title: 'Audio Tagging',
    description: 'Identify and classify sounds in audio',
    icon: 'musical-note',
    route: '/(tabs)/features/audio-tagging',
    color: '#FF9800',
  },
  {
    title: 'Speaker ID',
    description: 'Recognize and identify speakers from voice',
    icon: 'person',
    route: '/(tabs)/features/speaker-id',
    color: '#9C27B0',
  },
  {
    title: 'Keyword Spotting',
    description: 'Detect custom keywords in real-time audio',
    icon: 'search',
    route: '/(tabs)/features/kws',
    color: '#F44336',
  },
  {
    title: 'Voice Activity Detection',
    description: 'Detect speech vs silence in audio streams',
    icon: 'pulse',
    route: '/(tabs)/features/vad',
    color: '#607D8B',
  },
  {
    title: 'Language Identification',
    description: 'Identify the spoken language in audio',
    icon: 'language',
    route: '/(tabs)/features/language-id',
    color: '#00BCD4',
  },
  {
    title: 'Punctuation',
    description: 'Add punctuation to unpunctuated text',
    icon: 'text',
    route: '/(tabs)/features/punctuation',
    color: '#795548',
  },
  {
    title: 'Speaker Diarization',
    description: 'Segment audio by speaker — who spoke when',
    icon: 'people',
    route: '/(tabs)/features/diarization',
    color: '#3F51B5',
  },
  {
    title: 'Speech Enhancement',
    description: 'Remove background noise from audio files',
    icon: 'volume-high',
    route: '/(tabs)/features/denoising',
    color: '#009688',
  },
];

function FeatureCard({ title, description, icon, route, color }: FeatureCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const s = getStyles(theme);

  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => router.push(route as never)}
      activeOpacity={0.7}
    >
      <View style={[s.iconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={28} color="#fff" />
      </View>
      <View style={s.cardContent}>
        <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>{title}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 18 }}>{description}</Text>
      </View>
      <View style={s.cardActions}>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
      </View>
    </TouchableOpacity>
  );
}

export default function FeaturesScreen() {
  const theme = useTheme();

  // On web, only show features that are enabled in webFeatures config
  const visibleFeatures = Platform.OS === 'web'
    ? FEATURES.filter(f => isWebFeatureRouteEnabled(f.route))
    : FEATURES;

  return (
    <ScreenWrapper useInsets={false} contentContainerStyle={{ padding: theme.padding.m }}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>Explore sherpa-onnx capabilities</Text>
      {visibleFeatures.map((feature) => (
        <FeatureCard key={feature.route} {...feature} />
      ))}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({});

function getStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.roundness * 3,
      padding: theme.padding.m,
      marginBottom: theme.margin.m,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.roundness * 3,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    cardContent: {
      flex: 1,
    },
    cardActions: {
      paddingLeft: 8,
    },
  });
}
