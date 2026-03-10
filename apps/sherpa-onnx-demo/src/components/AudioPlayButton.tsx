import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { Text, useTheme } from './ui';

// Module-level singleton: stop the currently active player before starting a new one.
// This ensures only one AudioPlayButton plays at a time across all instances.
let globalStopFn: (() => void) | null = null;

function acquireGlobalPlayer(stop: () => void) {
  if (globalStopFn && globalStopFn !== stop) globalStopFn();
  globalStopFn = stop;
}

function releaseGlobalPlayer(stop: () => void) {
  if (globalStopFn === stop) globalStopFn = null;
}

/** Stop any currently playing AudioPlayButton instance. */
export function stopAllAudio() {
  if (globalStopFn) globalStopFn();
}

// Animated equalizer bars shown while audio is playing
function EqualizerBars({ color }: { color: string }) {
  const bar1 = useRef(new Animated.Value(0.3)).current;
  const bar2 = useRef(new Animated.Value(0.7)).current;
  const bar3 = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const makeLoop = (val: Animated.Value, peak: number, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: peak, duration: dur, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.2, duration: dur, useNativeDriver: true }),
        ])
      );

    const a1 = makeLoop(bar1, 1.0, 380);
    const a2 = makeLoop(bar2, 1.0, 560);
    const a3 = makeLoop(bar3, 1.0, 460);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [bar1, bar2, bar3]);

  const barBase: ViewStyle = { width: 3, height: 14, borderRadius: 2, backgroundColor: color };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 18 }}>
      <Animated.View style={[barBase, { transform: [{ scaleY: bar1 }] }]} />
      <Animated.View style={[barBase, { transform: [{ scaleY: bar2 }] }]} />
      <Animated.View style={[barBase, { transform: [{ scaleY: bar3 }] }]} />
    </View>
  );
}

interface AudioPlayButtonProps {
  uri: string;
  label?: string;
  disabled?: boolean;
  style?: ViewStyle;
  /** compact = icon only (no label), default = icon + label */
  compact?: boolean;
}

export function AudioPlayButton({ uri, label, disabled, style, compact = false }: AudioPlayButtonProps) {
  const theme = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const isPlayingRef = useRef(false);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (playerRef.current) {
      try { playerRef.current.pause(); } catch (_) { /* ignore */ }
      playerRef.current.remove();
      playerRef.current = null;
    }
    releaseGlobalPlayer(stop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  const handlePress = useCallback(async () => {
    if (isPlaying) { stop(); return; }
    if (isPlayingRef.current || disabled) return;

    isPlayingRef.current = true;
    acquireGlobalPlayer(stop);

    try {
      const player = createAudioPlayer({ uri });
      playerRef.current = player;
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          isPlayingRef.current = false;
          setIsPlaying(false);
          playerRef.current = null;
          releaseGlobalPlayer(stop);
        }
      });
      player.play();
      setIsPlaying(true);
    } catch (_) {
      isPlayingRef.current = false;
      releaseGlobalPlayer(stop);
    }
  }, [isPlaying, uri, disabled, stop]);

  const iconColor = isPlaying ? theme.colors.onPrimary : theme.colors.primary;
  const bgColor = isPlaying ? theme.colors.primary : 'transparent';
  const borderColor = isPlaying ? theme.colors.primary : theme.colors.outlineVariant;

  if (compact) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        style={[
          {
            width: 40, height: 40, borderRadius: 20,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: bgColor,
            borderWidth: 1.5, borderColor,
          },
          disabled && { opacity: 0.4 },
          style,
        ]}
      >
        {isPlaying ? (
          <EqualizerBars color={iconColor} />
        ) : (
          <Ionicons name="play" size={18} color={theme.colors.primary} />
        )}
      </TouchableOpacity>
    );
  }

  const displayLabel = label ?? (isPlaying ? 'Playing' : 'Play');

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      style={[
        {
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingHorizontal: 14, paddingVertical: 10,
          borderRadius: theme.roundness * 2,
          backgroundColor: bgColor,
          borderWidth: 1.5, borderColor,
          alignSelf: 'flex-start',
        },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      {isPlaying ? (
        <>
          <EqualizerBars color={iconColor} />
          <Text variant="labelLarge" style={{ color: iconColor, fontWeight: '600' }}>
            {displayLabel}
          </Text>
          <Ionicons name="stop" size={14} color={iconColor} />
        </>
      ) : (
        <>
          <Ionicons name="play" size={16} color={theme.colors.primary} />
          <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: '600' }}>
            {displayLabel}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
