import { NativeModules } from 'react-native';
import { SherpaOnnxAPI } from '../SherpaOnnxAPI';
import type { SherpaOnnxConfig } from '../types/interfaces';

// Mock the native modules
jest.mock('react-native', () => ({
  NativeModules: {
    SherpaOnnx: {
      initialize: jest.fn(() => Promise.resolve(true)),
      recognize: jest.fn(() => Promise.resolve({ text: 'test result' })),
      recognizeFile: jest.fn(() => Promise.resolve({ text: 'file result' })),
      synthesize: jest.fn(() => Promise.resolve('path/to/audio.wav')),
      startStreaming: jest.fn(() => Promise.resolve(true)),
      feedAudioContent: jest.fn(() =>
        Promise.resolve({ text: 'interim result' })
      ),
      stopStreaming: jest.fn(() => Promise.resolve({ text: 'final result' })),
      release: jest.fn(() => Promise.resolve(true)),
      getAvailableVoices: jest.fn(() => Promise.resolve(['voice1', 'voice2'])),
      isFeatureSupported: jest.fn((feature) =>
        Promise.resolve(feature === 'stt')
      ),
    },
  },
  Platform: {
    select: jest.fn(() => ''),
  },
}));

describe('SherpaOnnxAPI', () => {
  const mockConfig: SherpaOnnxConfig = {
    modelPath: '/path/to/model',
    language: 'en',
    sampleRate: 16000,
    channels: 1,
  };

  let sherpaOnnx: SherpaOnnxAPI;

  beforeEach(() => {
    jest.clearAllMocks();
    sherpaOnnx = new SherpaOnnxAPI(mockConfig);
  });

  it('should initialize correctly', async () => {
    const result = await sherpaOnnx.initialize();
    expect(result).toBe(true);
    expect(NativeModules.SherpaOnnx.initialize).toHaveBeenCalledWith(
      mockConfig
    );
  });

  it('should perform speech to text with audio data', async () => {
    const audioData = [0.1, 0.2, 0.3];
    const result = await sherpaOnnx.speechToText(audioData);
    expect(result).toEqual({ text: 'test result' });
    expect(NativeModules.SherpaOnnx.recognize).toHaveBeenCalledWith(
      audioData,
      {}
    );
  });

  it('should perform speech to text with file path', async () => {
    const filePath = '/path/to/audio.wav';
    const result = await sherpaOnnx.speechToText(filePath);
    expect(result).toEqual({ text: 'file result' });
    expect(NativeModules.SherpaOnnx.recognizeFile).toHaveBeenCalledWith(
      filePath,
      {}
    );
  });

  it('should perform text to speech', async () => {
    const text = 'Hello, world!';
    const options = { voiceId: 'voice1' };
    const result = await sherpaOnnx.textToSpeech(text, options);
    expect(result).toBe('path/to/audio.wav');
    expect(NativeModules.SherpaOnnx.synthesize).toHaveBeenCalledWith(
      text,
      options
    );
  });

  it('should handle streaming recognition', async () => {
    // Start streaming
    const options = { interimResults: true };
    await sherpaOnnx.startStreaming(options);
    expect(NativeModules.SherpaOnnx.startStreaming).toHaveBeenCalledWith(
      options
    );

    // Feed audio content
    const audioChunk = [0.1, 0.2, 0.3];
    const interimResult = await sherpaOnnx.feedAudioContent(audioChunk);
    expect(interimResult).toEqual({ text: 'interim result' });
    expect(NativeModules.SherpaOnnx.feedAudioContent).toHaveBeenCalledWith(
      audioChunk
    );

    // Stop streaming
    const finalResult = await sherpaOnnx.stopStreaming();
    expect(finalResult).toEqual({ text: 'final result' });
    expect(NativeModules.SherpaOnnx.stopStreaming).toHaveBeenCalled();
  });

  it('should get available voices', async () => {
    const voices = await sherpaOnnx.getAvailableVoices();
    expect(voices).toEqual(['voice1', 'voice2']);
    expect(NativeModules.SherpaOnnx.getAvailableVoices).toHaveBeenCalled();
  });

  it('should check if a feature is supported', async () => {
    const sttSupported = await SherpaOnnxAPI.isFeatureSupported('stt');
    expect(sttSupported).toBe(true);

    const ttsSupported = await SherpaOnnxAPI.isFeatureSupported('tts');
    expect(ttsSupported).toBe(false);

    expect(NativeModules.SherpaOnnx.isFeatureSupported).toHaveBeenCalledTimes(
      2
    );
  });

  it('should release resources', async () => {
    const result = await sherpaOnnx.release();
    expect(result).toBe(true);
    expect(NativeModules.SherpaOnnx.release).toHaveBeenCalled();
  });
});
