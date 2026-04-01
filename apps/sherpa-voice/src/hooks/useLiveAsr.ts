import { ASR } from '@siteed/sherpa-onnx.rn';
import { useCallback, useRef, useState } from 'react';
import { baseLogger } from '../config';

const logger = baseLogger.extend('LiveAsr');

interface UseLiveAsrOptions {
  onCommit?: (text: string) => void;
  onError?: (error: string) => void;
  onInterimUpdate?: (text: string) => void;
}

export interface UseLiveAsrResult {
  committedText: string;
  interimText: string;
  isListening: boolean;
  start: () => void;
  stop: () => void;
  clear: () => void;
  feedAudio: (samples: number[], sampleRate: number) => void;
}

export function useLiveAsr(options: UseLiveAsrOptions = {}): UseLiveAsrResult {
  const [committedText, setCommittedText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const processingRef = useRef(false);
  const queueRef = useRef<{ samples: number[]; sampleRate: number }[]>([]);
  const listeningRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (processingRef.current || !listeningRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;

    processingRef.current = true;
    try {
      await ASR.acceptWaveform(next.sampleRate, next.samples);
      const { isEndpoint } = await ASR.isEndpoint();
      const { text } = await ASR.getResult();

      if (isEndpoint && text.length > 0) {
        logger.info(`Committed text (${text.length} chars): "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
        setCommittedText((prev) => prev ? `${prev} ${text}` : text);
        setInterimText('');
        options.onCommit?.(text);
        await ASR.resetStream();
      } else {
        setInterimText(text);
        options.onInterimUpdate?.(text);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (!listeningRef.current) {
        logger.debug(`Ignoring post-stop live ASR error: ${errorMessage}`);
        return;
      }
      logger.warn(`feedAudio error: ${errorMessage}`);
      options.onError?.(errorMessage);
    } finally {
      processingRef.current = false;
      // Process next queued chunk
      if (queueRef.current.length > 0 && listeningRef.current) {
        processQueue();
      }
    }
  }, []);

  const feedAudio = useCallback(
    (samples: number[], sampleRate: number) => {
      if (!listeningRef.current) return;
      queueRef.current.push({ samples, sampleRate });
      processQueue();
    },
    [processQueue]
  );

  const start = useCallback(() => {
    logger.info('Live ASR started');
    listeningRef.current = true;
    setIsListening(true);
    setCommittedText('');
    setInterimText('');
    queueRef.current = [];
  }, []);

  const stop = useCallback(() => {
    logger.info('Live ASR stopped');
    listeningRef.current = false;
    setIsListening(false);
    queueRef.current = [];
  }, []);

  const clear = useCallback(() => {
    setCommittedText('');
    setInterimText('');
  }, []);

  return {
    committedText,
    interimText,
    isListening,
    start,
    stop,
    clear,
    feedAudio,
  };
}
