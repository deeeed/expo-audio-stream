import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@siteed/design-system";
import { Link } from "expo-router";
import React from "react";
import { Linking, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

const APP_STORE_URL = "https://apps.apple.com/us/app/sherpa-voice/id6760437954";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=net.siteed.sherpavoice";

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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Sherpa Voice</Text>
        <Text style={styles.subtitle}>
          On-device speech &amp; audio ML — no cloud required
        </Text>

        <Text style={styles.paragraph}>
          Speech recognition, text-to-speech, speaker ID, audio tagging, and
          more — all running locally on your device with sherpa-onnx.
        </Text>

        <View style={styles.storeButtonsContainer}>
          <Button
            mode="contained"
            icon="apple"
            onPress={() => Linking.openURL(APP_STORE_URL)}
            style={{ marginRight: 8 }}
          >
            App Store
          </Button>
          <Button
            mode="contained"
            icon="google-play"
            onPress={() => Linking.openURL(PLAY_STORE_URL)}
          >
            Google Play
          </Button>
        </View>

        <View style={styles.divider} />

        <View style={styles.featureContainer}>
          <Text style={styles.featureTitle}>Why use the native app?</Text>

          <View style={styles.featureRow}>
            <MaterialCommunityIcons
              name="download"
              size={24}
              color={theme.colors.primary}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>
              Download and manage 30+ ML models for speech, audio, and language tasks
            </Text>
          </View>

          <View style={styles.featureRow}>
            <MaterialCommunityIcons
              name="microphone"
              size={24}
              color={theme.colors.primary}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>
              Real-time microphone input for live speech recognition and voice activity detection
            </Text>
          </View>

          <View style={styles.featureRow}>
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={24}
              color={theme.colors.primary}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>
              Hardware-accelerated inference — GPU support on compatible devices
            </Text>
          </View>
        </View>

        <Button
          mode="outlined"
          icon="github"
          onPress={() => Linking.openURL("https://github.com/deeeed/audiolab")}
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
