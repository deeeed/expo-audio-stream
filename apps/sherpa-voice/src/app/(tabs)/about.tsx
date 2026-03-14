import React, { useMemo } from 'react';
import { Image, Linking, Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import {
  LabelSwitch,
  ListItem,
  ScreenWrapper,
  useThemePreferences,
  type AppTheme,
} from '@siteed/design-system';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppUpdates } from '../../hooks/useAppUpdates';
import { Updater } from '../../components/Updater';

const getStyles = ({ theme, insets }: { theme: AppTheme; insets?: { bottom: number } }) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.gap || 10,
      paddingHorizontal: theme.padding.s,
      paddingBottom: insets?.bottom || 80,
      paddingTop: 0,
    },
    iconContainer: {
      alignItems: 'center',
    },
    versionContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
    },
    version: {
      fontSize: 12,
      paddingTop: 5,
      color: 'lightgrey',
    },
    configSection: {
      marginTop: 16,
      marginBottom: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 8,
      color: theme.colors.onSurface,
    },
    listItemContainer: {
      backgroundColor: theme.colors.surface,
      margin: 0,
    },
    aboutText: {
      color: theme.colors.onTertiaryContainer,
    },
    aboutContainer: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      backgroundColor: theme.colors.tertiaryContainer,
    },
  });

/* eslint-disable-next-line @typescript-eslint/no-require-imports, global-require */
const logoSource = require('@assets/icon.png');

export default function AboutScreen() {
  const { toggleDarkMode, darkMode, theme } = useThemePreferences();
  const { bottom } = useSafeAreaInsets();
  const styles = useMemo(() => getStyles({ theme, insets: { bottom } }), [theme, bottom]);
  const {
    checking, downloading, doUpdate,
    isUpdateAvailable, checkUpdates, canUpdate,
    runtimeVersion: runtimeVersionRaw, appVersion,
    lastChecked, error,
  } = useAppUpdates();
  const isWeb = Platform.OS === 'web';
  const runtimeVersion = typeof runtimeVersionRaw === 'string' ? runtimeVersionRaw : 'unknown';

  return (
    <ScreenWrapper
      withScrollView
      useInsets={false}
      contentContainerStyle={styles.container}
    >
      <View style={styles.iconContainer}>
        <Image source={logoSource} style={{ width: 100, height: 100 }} />
        <Text>Sherpa Voice</Text>
        <View style={styles.versionContainer}>
          <Text style={styles.version}>v{appVersion}</Text>
          <Text style={styles.version}>Runtime: {runtimeVersion}</Text>
        </View>
      </View>

      <View style={styles.aboutContainer}>
        <Text style={styles.aboutText}>
          On-device speech recognition, TTS, speaker ID and more — no cloud, no internet required.
          Powered by sherpa-onnx and @siteed/audio-studio.
        </Text>
      </View>

      <View style={styles.configSection}>
        <Text style={styles.sectionTitle}>Links</Text>
        <ListItem
          contentContainerStyle={styles.listItemContainer}
          label="GitHub Repository"
          subLabel="Star or fork the project"
          onPress={() => Linking.openURL('https://github.com/deeeed/audiolab')}
        />
        <ListItem
          contentContainerStyle={styles.listItemContainer}
          label="Siteed.net"
          subLabel="More projects by Arthur Breton"
          onPress={() => Linking.openURL('https://siteed.net')}
        />
      </View>

      <LabelSwitch
        label="Dark Mode"
        containerStyle={{ backgroundColor: theme.colors.surface }}
        onValueChange={toggleDarkMode}
        value={darkMode}
      />

      {!isWeb && (
        <Updater
          isUpdateAvailable={isUpdateAvailable}
          checking={checking}
          downloading={downloading}
          onUpdate={doUpdate}
          onCheck={() => checkUpdates(false)}
          canUpdate={canUpdate}
          lastChecked={lastChecked}
          error={error}
        />
      )}
    </ScreenWrapper>
  );
}
