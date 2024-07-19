// playground/src/context/AudioFilesProvider.tsx
import { AudioRecordingResult } from "@siteed/expo-audio-stream";
import { useLogger } from "@siteed/react-native-logger";
import * as FileSystem from "expo-file-system";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  deleteAudioFile,
  listAudioFiles as listIndexedDBAudioFiles,
} from "../utils/indexedDB";
import { isWeb } from "../utils/utils";

interface AudioFilesContextValue {
  ready: boolean;
  files: AudioRecordingResult[];
  totalAudioStorageSize: number;
  refreshFiles: () => Promise<void>;
  removeFile: (fileUri: string) => Promise<void>;
  clearFiles: () => Promise<void>;
}

const AudioFilesContext = createContext<AudioFilesContextValue>({
  ready: false,
  files: [],
  totalAudioStorageSize: 0,
  refreshFiles: async () => {},
  removeFile: async () => {},
  clearFiles: async () => {},
});

export const AudioFilesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [files, setFiles] = useState<AudioRecordingResult[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [totalAudioStorageSize, setTotalAudioStorageSize] = useState<number>(0);
  const { logger } = useLogger("AudioFilesProvider");

  const calculateTotalAudioStorageSize = useCallback(
    (files: AudioRecordingResult[]) => {
      return files.reduce((total, file) => total + file.size, 0);
    },
    [],
  );

  const listAudioFiles = useCallback(async () => {
    try {
      if (isWeb) {
        const records = await listIndexedDBAudioFiles();
        logger.debug(`Found records in indexedDB`, records);
        return records.map((record) => {
          const blob = new Blob([record.arrayBuffer], {
            type: record.metadata.mimeType,
          });
          const webAudioUri = URL.createObjectURL(blob);
          return { ...record.metadata, fileUri: webAudioUri };
        });
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
        ) as AudioRecordingResult[];
      }
    } catch (error) {
      logger.error(`Failed to list audio files`, error);
    } finally {
      setReady(true);
    }
  }, []);

  const deleteAudioAndMetadata = async (audioUri: string) => {
    if (isWeb) {
      await deleteAudioFile({ fileName: audioUri });
    } else {
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
    }
  };

  const refreshFiles = useCallback(async () => {
    const loadedFiles = (await listAudioFiles()) || [];
    setFiles(loadedFiles);
  }, []);

  const removeFile = useCallback(async (fileUri: string) => {
    await deleteAudioAndMetadata(fileUri);
    await refreshFiles();
  }, []);

  const clearFiles = useCallback(async () => {
    try {
      if (isWeb) {
        await listIndexedDBAudioFiles().then((records) => {
          return Promise.all(
            records.map((record) =>
              deleteAudioFile({ fileName: record.metadata.fileUri }),
            ),
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

  useEffect(() => {
    setTotalAudioStorageSize(calculateTotalAudioStorageSize(files));
  }, [files]);

  return (
    <AudioFilesContext.Provider
      value={{
        ready,
        files,
        totalAudioStorageSize,
        refreshFiles,
        removeFile,
        clearFiles,
      }}
    >
      {children}
    </AudioFilesContext.Provider>
  );
};

export const useAudioFiles = () => useContext(AudioFilesContext);
