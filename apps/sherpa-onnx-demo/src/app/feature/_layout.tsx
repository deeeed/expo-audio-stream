import { Stack } from 'expo-router';
import React from 'react';

export default function FeatureLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="asr" options={{ title: 'Speech Recognition' }} />
      <Stack.Screen name="tts" options={{ title: 'Text-to-Speech' }} />
      <Stack.Screen name="audio-tagging" options={{ title: 'Audio Tagging' }} />
      <Stack.Screen name="speaker-id" options={{ title: 'Speaker ID' }} />
      <Stack.Screen name="kws" options={{ title: 'Keyword Spotting' }} />
      <Stack.Screen name="vad" options={{ title: 'Voice Activity Detection' }} />
    </Stack>
  );
}
