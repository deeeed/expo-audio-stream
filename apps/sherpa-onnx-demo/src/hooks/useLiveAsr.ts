import { ASR } from '@siteed/sherpa-onnx.rn';
import { useCallback, useRef, useState } from 'react';

export interface UseLiveAsrResult {
  committedText: string;
  interimText: string;
  isListening: boolean;
  start: () => void;
  stop: () => void;
  clear: () => void;
  feedAudio: (samples: number[], sampleRate: number) => void;
}

export function useLiveAsr(): UseLiveAsrResult {
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
        setCommittedText((prev) => prev ? `${prev} ${text}` : text);
        setInterimText('');
        await ASR.resetStream();
      } else {
        setInterimText(text);
      }
    } catch (e) {
      console.warn('[useLiveAsr] feedAudio error:', e);
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
    listeningRef.current = true;
    setIsListening(true);
    setCommittedText('');
    setInterimText('');
    queueRef.current = [];
  }, []);

  const stop = useCallback(() => {
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
