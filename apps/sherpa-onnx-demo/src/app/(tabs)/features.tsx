import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  route: string;
  color: string;
  hasLiveMode?: boolean;
  liveRoute?: string;
}

const FEATURES: FeatureCardProps[] = [
  {
    title: 'Speech Recognition',
    description: 'Convert speech to text using streaming or offline models',
    icon: 'mic',
    route: '/feature/asr',
    color: '#4CAF50',
    hasLiveMode: true,
    liveRoute: '/live-asr',
  },
  {
    title: 'Text-to-Speech',
    description: 'Convert text to natural-sounding speech',
    icon: 'chatbox-ellipses',
    route: '/feature/tts',
    color: '#2196F3',
  },
  {
    title: 'Audio Tagging',
    description: 'Identify and classify sounds in audio',
    icon: 'musical-note',
    route: '/feature/audio-tagging',
    color: '#FF9800',
  },
  {
    title: 'Speaker ID',
    description: 'Recognize and identify speakers from voice',
    icon: 'person',
    route: '/feature/speaker-id',
    color: '#9C27B0',
  },
  {
    title: 'Keyword Spotting',
    description: 'Detect custom keywords in real-time audio',
    icon: 'search',
    route: '/feature/kws',
    color: '#F44336',
  },
  {
    title: 'Voice Activity Detection',
    description: 'Detect speech vs silence in audio streams',
    icon: 'pulse',
    route: '/feature/vad',
    color: '#607D8B',
  },
  {
    title: 'Language Identification',
    description: 'Identify the spoken language in audio',
    icon: 'language',
    route: '/feature/language-id',
    color: '#00BCD4',
  },
];

function FeatureCard({ title, description, icon, route, color, hasLiveMode, liveRoute }: FeatureCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(route as never)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={28} color="#fff" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      <View style={styles.cardActions}>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </View>
      {hasLiveMode && liveRoute && (
        <TouchableOpacity
          style={[styles.liveBadge, { backgroundColor: color }]}
          onPress={(e) => {
            e.stopPropagation();
            router.push(liveRoute as never);
          }}
        >
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function FeaturesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Features</Text>
        <Text style={styles.subtitle}>Explore sherpa-onnx capabilities</Text>
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.route} {...feature} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 3,
  },
  cardDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  cardActions: {
    paddingLeft: 8,
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
