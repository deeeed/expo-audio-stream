import { useLogger } from "@siteed/react-native-logger";
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

interface AudioFilesContextValue {
  files: AudioStreamResult[];
  refreshFiles: () => Promise<void>;
  removeFile: (fileUri: string) => Promise<void>;
}

const AudioFilesContext = createContext<AudioFilesContextValue>({
  files: [],
  refreshFiles: async () => {},
  removeFile: async () => {},
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
      return [];
    }
    const directoryUri = FileSystem.documentDirectory;
    if (!directoryUri) {
      throw new Error(`No directoryUri found`);
    }

    const fileList = await FileSystem.readDirectoryAsync(directoryUri);
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
          return {
            fileUri: `${directoryUri}${audioFile}`,
            ...metadata,
          };
        }
        return null;
      }),
    );

    return audioStreamResults.filter(
      (result) => result !== null,
    ) as AudioStreamResult[];
  }, []);

  const deleteAudioAndMetadata = async (audioUri: string) => {
    const jsonPath = audioUri.replace(/\.wav$/, ".json");
    await FileSystem.deleteAsync(audioUri);
    await FileSystem.deleteAsync(jsonPath);
    logger.debug(`Deleted audio and metadata for ${audioUri}`);
  };

  const refreshFiles = useCallback(async () => {
    const loadedFiles = await listAudioFiles();
    setFiles(loadedFiles);
  }, []);

  const removeFile = useCallback(async (fileUri: string) => {
    await deleteAudioAndMetadata(fileUri);
    await refreshFiles();
  }, []);

  useEffect(() => {
    refreshFiles();
  }, []);

  return (
    <AudioFilesContext.Provider value={{ files, refreshFiles, removeFile }}>
      {children}
    </AudioFilesContext.Provider>
  );
};

export const useAudioFiles = () => useContext(AudioFilesContext);
