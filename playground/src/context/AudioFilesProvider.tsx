// playground/src/context/AudioFilesProvider.tsx
import { useLogger } from "@siteed/react-native-logger";
import { error } from "console";
import * as FileSystem from "expo-file-system";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";

import { AudioStreamResult } from "../../../src/ExpoAudioStream.types";
import {
  WEB_STORAGE_KEY_PREFIX,
  WEB_STORAGE_METADATA_KEY_PREFIX,
} from "../constants";

interface AudioFilesContextValue {
  files: AudioStreamResult[];
  refreshFiles: () => Promise<void>;
  removeFile: (fileUri: string) => Promise<void>;
  clearFiles: () => Promise<void>;
}

const AudioFilesContext = createContext<AudioFilesContextValue>({
  files: [],
  refreshFiles: async () => {},
  removeFile: async () => {},
  clearFiles: async () => {},
});

export const AudioFilesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [files, setFiles] = useState<AudioStreamResult[]>([]);
  const { logger } = useLogger("AudioFilesProvider");

  const listAudioFiles = useCallback(async () => {
    if (Platform.OS === "web") {
      const keys = Object.keys(sessionStorage).filter((key) =>
        key.startsWith(WEB_STORAGE_KEY_PREFIX),
      );

      return keys
        .map((key) => {
          const fileId = key.replace(WEB_STORAGE_KEY_PREFIX, "");
          const metadata = sessionStorage.getItem(
            `${WEB_STORAGE_METADATA_KEY_PREFIX}${fileId}`,
          );

          return metadata ? JSON.parse(metadata) : null;
        })
        .filter((file) => file !== null) as AudioStreamResult[];
    } else {
      const directoryUri = FileSystem.documentDirectory;
      if (!directoryUri) {
        throw new Error(`No directoryUri found`);
      }

      const fileList = await FileSystem.readDirectoryAsync(directoryUri);
      logger.debug(`Found files in directory`, fileList);
      const audioFiles = fileList.filter((file) => file.endsWith(".wav"));
      const jsonFiles = fileList.filter((file) => file.endsWith(".json"));

      const audioStreamResults = await Promise.all(
        audioFiles.map(async (audioFile) => {
          const jsonFile = jsonFiles.find(
            (jf) => jf.replace(".json", "") === audioFile.replace(".wav", ""),
          );
          if (jsonFile) {
            const jsonData = await FileSystem.readAsStringAsync(
              `${directoryUri}${jsonFile}`,
            );
            const metadata = JSON.parse(jsonData);
            logger.debug(`Loaded metadata for ${audioFile}`, metadata);
            return {
              fileUri: `${directoryUri}${audioFile}`,
              ...metadata,
            };
          } else {
            logger.warn(`No metadata found for ${audioFile}`);
            // Remove the audio file if no metadata is found
            try {
              await deleteAudioAndMetadata(`${directoryUri}${audioFile}`);
            } catch {
              // ignore delete error
            }
          }
          return null;
        }),
      );

      // // Iterate through json files and remove any that don't have a corresponding audio file
      // await Promise.all(
      //   jsonFiles.map(async (jsonFile) => {
      //     const audioFile = audioFiles.find(
      //       (af) => af.replace(".wav", "") === jsonFile.replace(".json", ""),
      //     );
      //     if (!audioFile) {
      //       logger.error(`No audio file found for ${jsonFile}`);
      //       await FileSystem.deleteAsync(`${directoryUri}${jsonFile}`);
      //     }
      //   }),
      // );

      return audioStreamResults.filter(
        (result) => result !== null,
      ) as AudioStreamResult[];
    }
  }, []);

  const deleteAudioAndMetadata = async (audioUri: string) => {
    const jsonPath = audioUri.replace(/\.wav$/, ".json");
    // logger.debug(`Deleting audio and metadata for ${audioUri}`);
    // check if exists before deletion
    if (!(await FileSystem.getInfoAsync(audioUri))) {
      logger.error(`Audio file does not exist at ${audioUri}`);
    } else {
      await FileSystem.deleteAsync(audioUri);
    }

    logger.debug(`Deleted audio for ${jsonPath}`);
    if (!(await FileSystem.getInfoAsync(jsonPath))) {
      logger.error(`Metadata file does not exist at ${jsonPath}`);
    } else {
      await FileSystem.deleteAsync(jsonPath);
    }
    logger.debug(`Deleted audio and metadata for ${audioUri}`);
  };

  const refreshFiles = useCallback(async () => {
    const loadedFiles = await listAudioFiles();
    setFiles(loadedFiles);
  }, []);

  const removeFile = useCallback(async (fileUri: string) => {
    if (Platform.OS === "web") {
      const metadataKey = Object.keys(sessionStorage).find((key) => {
        const metadata = sessionStorage.getItem(key);
        try {
          return metadata ? JSON.parse(metadata).fileUri === fileUri : false;
        } catch (_error) {
          // logger.error(`Failed to parse metadata for key: ${key}`, error);
          logger.error(
            `Failed to parse metadata for key: ${key}`,
            metadata,
            error,
          );
          return false;
        }
      });

      if (metadataKey) {
        const fileId = metadataKey.replace(WEB_STORAGE_METADATA_KEY_PREFIX, "");
        sessionStorage.removeItem(`${WEB_STORAGE_KEY_PREFIX}${fileId}`);
        sessionStorage.removeItem(metadataKey);
      }
    } else {
      await deleteAudioAndMetadata(fileUri);
    }
    await refreshFiles();
  }, []);

  const clearFiles = useCallback(async () => {
    try {
      if (Platform.OS === "web") {
        const keys = Object.keys(sessionStorage).filter((key) =>
          key.startsWith(WEB_STORAGE_KEY_PREFIX),
        );

        keys.forEach((key) => {
          const fileId = key.replace(WEB_STORAGE_KEY_PREFIX, "");
          sessionStorage.removeItem(key);
          sessionStorage.removeItem(
            `${WEB_STORAGE_METADATA_KEY_PREFIX}${fileId}`,
          );
        });

        setFiles([]);
      } else {
        const directoryUri = FileSystem.documentDirectory;
        if (!directoryUri) {
          throw new Error(`No directoryUri found`);
        }

        const fileList = await FileSystem.readDirectoryAsync(directoryUri);
        logger.debug(`Found files in directory`, fileList);
        // delete all files
        await Promise.all(
          fileList.map(async (file) => {
            try {
              logger.debug(`Deleting file: ${file}`);
              await FileSystem.deleteAsync(`${directoryUri}${file}`);
            } catch (error) {
              logger.error(`Failed to delete file: ${file}`, error);
            }
          }),
        );
        await refreshFiles();
      }
    } catch (error) {
      logger.error(`Failed to clear files`, error);
    }
  }, []);

  useEffect(() => {
    refreshFiles();
  }, []);

  return (
    <AudioFilesContext.Provider
      value={{ files, refreshFiles, removeFile, clearFiles }}
    >
      {children}
    </AudioFilesContext.Provider>
  );
};

export const useAudioFiles = () => useContext(AudioFilesContext);
