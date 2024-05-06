import { MaterialCommunityIcons } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTheme } from "@siteed/design-system";
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { Text } from "react-native-paper";

import { useSharedAudioRecorder } from "../../../../src";

const recordingColor = "red";

const isWeb = Platform.OS === "web";

export default function TabLayout() {
  const { isRecording } = useSharedAudioRecorder();
  const { colors } = useTheme();

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Record",
          tabBarLabel: ({ color, position }) => (
            <Text
              style={{
                color: isRecording ? recordingColor : color,
                paddingLeft: isWeb && position === "beside-icon" ? 20 : 0,
              }}
            >
              Record
            </Text>
          ),
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="record-circle"
              size={24}
              color={isRecording ? recordingColor : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="files"
        options={{
          title: "Files",
          href: isWeb ? null : "files",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="cog" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
