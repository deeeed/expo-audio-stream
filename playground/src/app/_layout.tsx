// playground/src/app/_layout.tsx
import { UIProvider } from "@siteed/design-system";
import { LoggerProvider } from "@siteed/react-native-logger";
import { Stack } from "expo-router/stack";

import { AudioRecorderProvider } from "../../../src";
import { AudioFilesProvider } from "../context/AudioFilesProvider";
import { ApplicationContextProvider } from "../context/application-context";
export default function RootLayout() {
  return (
    <LoggerProvider>
      <ApplicationContextProvider debugMode>
        <AudioRecorderProvider config={{ debug: true }}>
          <UIProvider>
            <AudioFilesProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
            </AudioFilesProvider>
          </UIProvider>
        </AudioRecorderProvider>
      </ApplicationContextProvider>
    </LoggerProvider>
  );
}
