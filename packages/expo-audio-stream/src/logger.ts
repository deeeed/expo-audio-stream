// packages/expo-audio-stream/src/logger.ts
import createDebug from "debug";

import { DEBUG_NAMESPACE } from "./constants";

type ConsoleLike = {
  log: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
};

export const getLogger = (tag: string): ConsoleLike => {
  const baseLogger = createDebug(`${DEBUG_NAMESPACE}:${tag}`);

  return {
    log: (...args: unknown[]) => baseLogger(...(args as [unknown])),
    debug: (...args: unknown[]) => baseLogger(...(args as [unknown])),
  };
};

export const enableAllLoggers = () => {
  createDebug.enable(`${DEBUG_NAMESPACE}:*`);
};

export const disableAllLoggers = () => {
  createDebug.disable();
};
