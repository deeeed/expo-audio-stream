import { useTheme } from '@siteed/design-system';
import { Stack } from 'expo-router';
import React from 'react';

export default function FeaturesLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="asr" options={{ title: 'Speech Recognition', headerBackTitle: 'Back' }} />
      <Stack.Screen name="tts" options={{ title: 'Text-to-Speech', headerBackTitle: 'Back' }} />
      <Stack.Screen name="audio-tagging" options={{ title: 'Audio Tagging', headerBackTitle: 'Back' }} />
      <Stack.Screen name="speaker-id" options={{ title: 'Speaker ID', headerBackTitle: 'Back' }} />
      <Stack.Screen name="kws" options={{ title: 'Keyword Spotting', headerBackTitle: 'Back' }} />
      <Stack.Screen name="vad" options={{ title: 'Voice Activity Detection', headerBackTitle: 'Back' }} />
      <Stack.Screen name="language-id" options={{ title: 'Language Identification', headerBackTitle: 'Back' }} />
      <Stack.Screen name="punctuation" options={{ title: 'Punctuation', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
