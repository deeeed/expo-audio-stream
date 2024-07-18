// packages/expo-audio-stream/src/logger.ts
import createDebug from "debug";

import { namespace } from "./constants";

type ConsoleLike = {
  log: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
};

export const getLogger = (tag: string): ConsoleLike => {
  const baseLogger = createDebug(`${namespace}:${tag}`);

  baseLogger("Logger initialized");
  return {
    log: (...args: any[]) => baseLogger(args),
    debug: (...args: any[]) => baseLogger(args),
  };
};
