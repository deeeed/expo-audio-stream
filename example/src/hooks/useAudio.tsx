import { useState, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import { useLogger } from '@siteed/react-native-logger';
import { useToast } from '@siteed/design-system';
import { AudioStreamResult } from '../../../src/ExpoAudioStream.types';
import { fetchArrayBuffer } from '../utils';

export const useAudio = (audioUri: string | undefined, showWaveform: boolean) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const { logger } = useLogger('useAudio');
  const { show } = useToast();

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  useEffect(() => {
    if (!showWaveform || !audioUri) return;

    const loadArrayBuffer = async () => {
      try {
        logger.debug(`Fetching audio array buffer from ${audioUri}`);
        const buffer = await fetchArrayBuffer(audioUri);
        setArrayBuffer(buffer);
        logger.debug(`Fetched audio array buffer from ${audioUri} --> length: ${buffer.byteLength} bytes`);
      } catch (error) {
        logger.error(`Failed to fetch audio ${audioUri} array buffer:`, error);
        show({ type: 'error', message: 'Failed to load audio data' });
      }
    };

    loadArrayBuffer().catch(logger.error);
  }, [audioUri, showWaveform, logger, show]);

  const updatePlaybackStatus = useCallback(
    ({ isLoaded, didJustFinish, positionMillis, error }: any) => {
      if (error) {
        logger.error(`Playback Error: ${error}`);
        return;
      }
      if (!isLoaded) {
        return;
      }
      setPosition(positionMillis);
      if (didJustFinish) {
        setIsPlaying(false);
        setPosition(0); // Reset position when playback finishes
      }
    },
    [logger],
  );

  const togglePlayPause = async () => {
    if(!audioUri) return;
    try {
      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true },
        );
        newSound.setOnPlaybackStatusUpdate(updatePlaybackStatus);
        setSound(newSound);
        setIsPlaying(true);
      } else {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.setPositionAsync(0); // Reset the position to the start
          await sound.playAsync();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      logger.error('Failed to play or pause the audio:', error);
      show({ type: 'error', message: 'Failed to play or pause the audio' });
    }
  };

  return {
    arrayBuffer,
    isPlaying,
    position,
    togglePlayPause,
  };
};
