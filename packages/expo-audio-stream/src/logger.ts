// packages/expo-audio-stream/src/logger.ts
import createDebug from "debug";

import { DEBUG_NAMESPACE } from "./constants";

type ConsoleLike = {
  log: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
};

export const getLogger = (tag: string): ConsoleLike => {
  const baseLogger = createDebug(`${DEBUG_NAMESPACE}:${tag}`);

  return {
    log: (...args: any[]) => baseLogger(args),
    debug: (...args: any[]) => baseLogger(args),
  };
};

export const enableAllLoggers = () => {
  createDebug.enable(`${DEBUG_NAMESPACE}:*`);
};

export const disableAllLoggers = () => {
  createDebug.disable();
};
