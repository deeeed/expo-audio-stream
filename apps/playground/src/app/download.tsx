import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button, useTheme } from "@siteed/design-system";
import { Link } from "expo-router";
import React from "react";
import { Linking, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

// Use generic App Store URL without country code and Google Play URL without language parameter
const APP_STORE_URL = "https://apps.apple.com/app/audio-playground/id6739774966";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=net.siteed.audioplayground";

export default function DownloadPage() {
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 16,
      alignItems: "center",
    },
    title: {
      ...theme.fonts.headlineMedium,
      color: theme.colors.onBackground,
      marginBottom: 16,
      textAlign: "center",
    },
    subtitle: {
      ...theme.fonts.titleMedium,
      color: theme.colors.onBackground,
      marginBottom: 24,
      textAlign: "center",
    },
    storeButtonsContainer: {
      flexDirection: "row",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: 16,
      marginBottom: 32,
    },
    featureContainer: {
      width: "100%",
      maxWidth: 600,
      marginBottom: 24,
    },
    featureTitle: {
      ...theme.fonts.titleMedium,
      color: theme.colors.onBackground,
      marginBottom: 16,
      textAlign: "center",
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    featureIcon: {
      marginRight: 16,
    },
    featureText: {
      ...theme.fonts.bodyMedium,
      color: theme.colors.onBackground,
      flex: 1,
    },
    webButtonContainer: {
      marginTop: 24,
      alignItems: "center",
    },
    webButtonText: {
      ...theme.fonts.bodySmall,
      color: theme.colors.primary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.outlineVariant,
      width: "100%",
      marginVertical: 24,
    },
    paragraph: {
      ...theme.fonts.bodyMedium,
      color: theme.colors.onBackground,
      marginBottom: 16,
      textAlign: "center",
      maxWidth: 600,
    },
  });

  const openAppStore = () => {
    Linking.openURL(APP_STORE_URL);
  };

  const openPlayStore = () => {
    Linking.openURL(PLAY_STORE_URL);
  };

  const openGitHub = () => {
    Linking.openURL("https://github.com/deeeed/expo-audio-stream");
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>AudioPlayground</Text>
        <Text style={styles.subtitle}>
          Cross-Platform Demo for @siteed/expo-audio-studio
        </Text>

        <Text style={styles.paragraph}>
          AudioPlayground demonstrates the capabilities of the expo-audio-studio library across all platforms. 
          Try it on multiple devices to experience the consistent audio processing capabilities.
        </Text>

        <View style={styles.storeButtonsContainer}>
          <Button
            mode="contained"
            icon="apple"
            onPress={openAppStore}
            style={{ marginRight: 8 }}
          >
            App Store
          </Button>
          <Button
            mode="contained"
            icon="google-play"
            onPress={openPlayStore}
          >
            Google Play
          </Button>
        </View>

        <View style={styles.divider} />

        <View style={styles.featureContainer}>
          <Text style={styles.featureTitle}>Help Improve AudioPlayground</Text>
          
          <Text style={styles.paragraph}>
            By testing across different platforms, you help ensure consistent functionality and identify platform-specific issues.
            Your feedback is incredibly valuable for the continued improvement of this library!
          </Text>
          
          <View style={styles.featureRow}>
            <MaterialCommunityIcons
              name="bug-check"
              size={24}
              color={theme.colors.primary}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>
              Try the same features on web, iOS, and Android to verify cross-platform compatibility
            </Text>
          </View>
          
          <View style={styles.featureRow}>
            <MaterialCommunityIcons
              name="github"
              size={24}
              color={theme.colors.primary}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>
              Report any issues on GitHub to help improve the library
            </Text>
          </View>
          
          <View style={styles.featureRow}>
            <MaterialCommunityIcons
              name="star"
              size={24}
              color={theme.colors.primary}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>
              If you find this useful, please leave a rating on the app stores or star the GitHub repo
            </Text>
          </View>
        </View>

        <Button 
          mode="outlined" 
          icon="github"
          onPress={openGitHub}
          style={{ marginBottom: 16 }}
        >
          View on GitHub
        </Button>

        {Platform.OS === "web" && (
          <View style={styles.webButtonContainer}>
            <Link href="/" asChild>
              <Button mode="outlined">Back to Web Version</Button>
            </Link>
          </View>
        )}
      </ScrollView>
    </View>
  );
} 