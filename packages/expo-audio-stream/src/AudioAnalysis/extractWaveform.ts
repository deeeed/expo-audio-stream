import ExpoAudioStreamModule from "../ExpoAudioStreamModule";
import { getLogger } from "../logger";

const logger = getLogger("extractWaveform");
export interface ExtractWaveformProps {
  fileUri: string;
  numberOfSamples: number;
  offset?: number;
  length?: number;
}
export const extractWaveform = async ({
  fileUri,
  numberOfSamples,
  offset = 0,
  length,
}: ExtractWaveformProps): Promise<unknown> => {
  const res = await ExpoAudioStreamModule.extractAudioAnalysis({
    fileUri,
    numberOfSamples,
    offset,
    length,
  });
  logger.log(`extractWaveform`, res);
  return res;
};
