// playground/src/app/(tabs)/play.tsx
import { ScreenWrapper } from "@siteed/design-system";
import { AudioAnalysis } from "@siteed/expo-audio-stream";
import { AudioVisualizer } from "@siteed/expo-audio-ui";
import React from "react";
import { analysisData } from "../data";

export const PlayPage = () => {
  return (
    <ScreenWrapper>
      <AudioVisualizer audioData={analysisData as unknown as AudioAnalysis} />
    </ScreenWrapper>
  );
};

export default PlayPage;
