import { UIProvider } from "@siteed/design-system";
import { LoggerProvider } from "@siteed/react-native-logger";
import { Stack } from "expo-router/stack";

import { AudioRecorderProvider } from "../../../src";
import { AudioFilesProvider } from "../context/AudioFilesProvider";
export default function RootLayout() {
  return (
    <LoggerProvider>
      <AudioRecorderProvider config={{ debug: true }}>
        <UIProvider>
          <AudioFilesProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </AudioFilesProvider>
        </UIProvider>
      </AudioRecorderProvider>
    </LoggerProvider>
  );
}
