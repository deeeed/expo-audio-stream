import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@siteed/design-system";
import { useRouter } from "expo-router";
import React, { useMemo, useCallback, useState, useEffect } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Key for storing banner dismiss state
const WEB_APP_BANNER_DISMISSED_KEY = "@AudioPlayground:webAppBannerDismissed";

export const WebAppBanner = () => {
  const theme = useTheme();
  const router = useRouter();
  const [isWebAppBannerDismissed, setIsWebAppBannerDismissed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load the dismissed state on mount
  useEffect(() => {
    const loadDismissedState = async () => {
      try {
        const value = await AsyncStorage.getItem(WEB_APP_BANNER_DISMISSED_KEY);
        setIsWebAppBannerDismissed(value === "true");
      } catch (error) {
        console.error("Failed to load banner state:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadDismissedState();
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

  const shouldShow = Platform.OS === "web" && !isWebAppBannerDismissed;

  const handlePress = useCallback(() => {
    router.navigate("/download");
  }, [router]);

  const handleDismiss = useCallback(async () => {
    setIsWebAppBannerDismissed(true);
    try {
      await AsyncStorage.setItem(WEB_APP_BANNER_DISMISSED_KEY, "true");
    } catch (error) {
      console.error("Failed to save banner state:", error);
    }
  }, []);

  if (!shouldShow || !isInitialized) {
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
            Try AudioPlayground on iOS and Android — your feedback is appreciated!
          </Text>
        </Pressable>
        <Pressable
          style={styles.dismissButton}
          onPress={handleDismiss}
        >
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