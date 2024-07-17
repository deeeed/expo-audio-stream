import React, { createContext, useContext } from "react";

import {
  UseAudioRecorderProps,
  UseAudioRecorderState,
  useAudioRecorder,
} from "./useAudioRecording";

const AudioRecorderContext = createContext<UseAudioRecorderState>({
  isRecording: false,
  isPaused: false,
  durationMs: 0,
  size: 0,
  // other properties filled on useAudioRecorder
} as UseAudioRecorderState);

interface AudioRecorderProviderProps {
  children: React.ReactNode;
  config?: UseAudioRecorderProps;
}

export const AudioRecorderProvider: React.FC<AudioRecorderProviderProps> = ({
  children,
  config = {},
}) => {
  const audioRecorder = useAudioRecorder(config);
  return (
    <AudioRecorderContext.Provider value={audioRecorder}>
      {children}
    </AudioRecorderContext.Provider>
  );
};

export const useSharedAudioRecorder = () => {
  const context = useContext(AudioRecorderContext);
  if (!context) {
    throw new Error(
      "useSharedAudioRecorder must be used within an AudioRecorderProvider",
    );
  }
  return context;
};
