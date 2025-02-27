import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { useTheme } from "@siteed/design-system";
import { Href, router, useNavigation } from "expo-router";
import { useEffect } from "react";
import { BackHandler } from "react-native";

import { HeaderIcon } from "../component/HeaderIcon";

interface UseScreenHeaderProps {
  title: string;
  rightElements?: () => React.ReactNode;
  backBehavior?: {
    fallbackUrl?: string;
    onBack?: () => void;
  };
}

export function useScreenHeader({
  title,
  rightElements,
  backBehavior,
}: UseScreenHeaderProps): void {
  const navigation = useNavigation();
  const theme = useTheme();

  // Handle back navigation logic
  const handleBackNavigation = () => {
    if (backBehavior?.onBack) {
      backBehavior.onBack();
      return true; // Prevent default behavior
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return true;
    }

    if (backBehavior?.fallbackUrl) {
      router.replace(backBehavior.fallbackUrl as Href);
      return true;
    }

    console.warn("No fallback url or onBack function provided");
    return false;
  };

  // Handle Android hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackNavigation,
    );

    return () => backHandler.remove();
  }, [backBehavior, navigation]);

  useEffect(() => {
    const options: NativeStackNavigationOptions = {
      headerShown: true,
      title,
      headerRight: rightElements,
    };

    if (backBehavior) {
      options.headerLeft = () => (
        <HeaderIcon
          IconComponent={Ionicons}
          name="chevron-back"
          activeColor={theme.colors.primary}
          inactiveColor={theme.colors.text}
          onPress={handleBackNavigation}
        />
      );
    }

    navigation.setOptions(options);
  }, [navigation, title, rightElements, backBehavior, theme, handleBackNavigation]);
}
