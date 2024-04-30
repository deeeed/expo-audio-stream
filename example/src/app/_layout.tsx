import { UIProvider } from "@siteed/design-system";
import { LoggerProvider } from "@siteed/react-native-logger";
import { Stack } from "expo-router/stack";
export default function Layout() {
  return (
    <LoggerProvider>
      <UIProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </UIProvider>
    </LoggerProvider>
  );
}
