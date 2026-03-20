import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@siteed/design-system";
import React, { useMemo, useCallback, useState, useEffect } from "react";
import { Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WEB_APP_BANNER_DISMISSED_KEY = "@SherpaVoice:webAppBannerDismissed";
const APP_STORE_URL = "https://apps.apple.com/us/app/sherpa-voice/id6760437954";

export const WebAppBanner = () => {
  const theme = useTheme();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(WEB_APP_BANNER_DISMISSED_KEY)
      .then((value) => setIsDismissed(value === "true"))
      .catch(() => {})
      .finally(() => setIsInitialized(true));
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outerContainer: {
          position: "relative",
          zIndex: 1,
          width: "100%",
        },
        container: {
          backgroundColor: theme.colors.primaryContainer,
          paddingVertical: 8,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: 44,
        },
        content: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        },
        text: {
          color: theme.colors.onPrimaryContainer,
          ...theme.fonts.bodySmall,
        },
        dismissButton: {
          padding: 4,
        },
      }),
    [theme],
  );

  const handlePress = useCallback(() => {
    Linking.openURL(APP_STORE_URL);
  }, []);

  const handleDismiss = useCallback(async () => {
    setIsDismissed(true);
    try {
      await AsyncStorage.setItem(WEB_APP_BANNER_DISMISSED_KEY, "true");
    } catch {}
  }, []);

  if (Platform.OS !== "web" || isDismissed || !isInitialized) {
    return null;
  }

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        <Pressable style={styles.content} onPress={handlePress}>
          <MaterialCommunityIcons
            name="cellphone"
            size={16}
            color={theme.colors.onPrimaryContainer}
          />
          <Text style={styles.text}>
            Get Sherpa Voice on iOS — try the full native experience!
          </Text>
        </Pressable>
        <Pressable style={styles.dismissButton} onPress={handleDismiss}>
          <MaterialCommunityIcons
            name="close"
            size={16}
            color={theme.colors.onPrimaryContainer}
          />
        </Pressable>
      </View>
    </View>
  );
};
