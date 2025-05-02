import { useCallback, useEffect } from 'react'

import { Ionicons } from '@expo/vector-icons'
import { router, useNavigation } from 'expo-router'
import { BackHandler } from 'react-native'

import { useTheme } from '@siteed/design-system'

import { HeaderIcon } from '../component/HeaderIcon'

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import type { Href } from 'expo-router'

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
  const navigation = useNavigation()
  const theme = useTheme()

  // Handle back navigation logic - wrapped in useCallback to prevent recreation on every render
  const handleBackNavigation = useCallback(() => {
    if (backBehavior?.onBack) {
      backBehavior.onBack()
      return true // Prevent default behavior
    }

    if (navigation.canGoBack()) {
      navigation.goBack()
      return true
    }

    if (backBehavior?.fallbackUrl) {
      router.replace(backBehavior.fallbackUrl as Href)
      return true
    }

    console.warn('No fallback url or onBack function provided')
    return false
  }, [backBehavior, navigation])

  // Handle Android hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackNavigation,
    )

    return () => backHandler.remove()
  }, [handleBackNavigation])

  useEffect(() => {
    const options: NativeStackNavigationOptions = {
      headerShown: true,
      title,
      headerRight: rightElements,
    }

    if (backBehavior) {
      options.headerLeft = () => (
        <HeaderIcon
          IconComponent={Ionicons}
          name="chevron-back"
          activeColor={theme.colors.primary}
          inactiveColor={theme.colors.text}
          onPress={handleBackNavigation}
        />
      )
    }

    navigation.setOptions(options)
  }, [navigation, title, rightElements, backBehavior, theme, handleBackNavigation])
}
