import { AppTheme, useTheme } from "@siteed/design-system";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

export interface UpdaterProps {
  isUpdateAvailable: boolean;
  checking: boolean;
  downloading: boolean;
  onUpdate: () => void;
  onCheck: () => void;
  canUpdate: boolean;
}

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderRadius: 8,
      alignItems: "center",
      gap: 12,
    },
  });
};

export const Updater: React.FC<UpdaterProps> = ({
  isUpdateAvailable,
  checking,
  downloading,
  onUpdate,
  onCheck,
  canUpdate,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme }), [theme]);

  return (
    <View style={styles.container}>
      {isUpdateAvailable ? (
        <>
          <Text variant="bodyMedium">
            {downloading
              ? "Downloading update..."
              : canUpdate
                ? "Update ready to install"
                : "A new version is available"}
          </Text>
          {canUpdate ? (
            <Button
              mode="contained"
              loading={checking}
              disabled={checking}
              icon="restart"
              onPress={onUpdate}
            >
              Update and Restart
            </Button>
          ) : (
            <Button
              mode="contained"
              loading={downloading}
              disabled={downloading}
              icon="download"
              onPress={onCheck}
            >
              Download Update
            </Button>
          )}
        </>
      ) : (
        <>
          <Button
            mode="outlined"
            loading={checking}
            disabled={checking}
            icon="update"
            onPress={onCheck}
          >
            Check for updates
          </Button>
        </>
      )}
    </View>
  );
};
