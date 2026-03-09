import type { ModelProvider, TtsGenerateResult, TtsInitResult, TtsModelConfig } from '@siteed/sherpa-onnx.rn';
import { TTS } from '@siteed/sherpa-onnx.rn';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Switch,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useTtsModels, useTtsModelWithConfig } from '../../../hooks/useModelWithConfig';
import { setAgenticPageState } from '../../../agentic-bridge';
import { InlineModelDownloader } from '../../../components/InlineModelDownloader';
import {
  ConfigRow,
  LoadingOverlay,
  ModelSelector,
  PageContainer,
  ResultsBox,
  Section,
  StatusBlock,
  Text,
  ThemedButton,
  useTheme,
} from '../../../components/ui';

// Default sample text for TTS
const DEFAULT_TEXT = "Hello, this is a test of the Sherpa Onnx TTS system. I hope you're having a great day!";

// Helper function to verify file existence
const verifyFileExists = async (filePath: string): Promise<boolean> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    return fileInfo.exists;
  } catch (error) {
    console.error(`Error checking file existence: ${filePath}`, error);
    return false;
  }
};

export default function TtsScreen() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [player, setPlayer] = useState<AudioPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  // TTS state variables
  const [ttsInitialized, setTtsInitialized] = useState(false);
  const [initResult, setInitResult] = useState<TtsInitResult | null>(null);
  const [ttsResult, setTtsResult] = useState<TtsGenerateResult | null>(null);
  const [speakerId, setSpeakerId] = useState(0);
  const [speakingRate, setSpeakingRate] = useState(1.0);
  const [numThreads, setNumThreads] = useState(2);
  const [debugMode, setDebugMode] = useState(false);
  const [provider, setProvider] = useState<ModelProvider>('cpu');
  const [autoPlay, setAutoPlay] = useState(true);
  // State to track pending model selection (for confirmation flow)
  const [/* pendingModelId */, setPendingModelId] = useState<string | null>(null);

  const router = useRouter();
  const theme = useTheme();

  // Use our new hooks
  const { downloadedModels } = useTtsModels();
  const { ttsConfig, localPath, isDownloaded } = useTtsModelWithConfig({ modelId: selectedModelId });

  // Register page state for agentic querying (replaces screenshots)
  useEffect(() => {
    setAgenticPageState({
      selectedModelId,
      ttsInitialized,
      isLoading,
      isPlaying,
      errorMessage: errorMessage || null,
      statusMessage: statusMessage || null,
      speakerId,
      speakingRate,
      hasResult: !!ttsResult,
    });
  }, [selectedModelId, ttsInitialized, isLoading, isPlaying, errorMessage, statusMessage, speakerId, speakingRate, ttsResult]);

  // Initialize audio system on component mount
  useEffect(() => {
    async function setupAudio() {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'duckOthers',
        });
        console.log('Audio system initialized successfully');
      } catch (error) {
        console.error('Failed to initialize audio system:', error);
      }
    }

    setupAudio();

    // Cleanup function
    return () => {
      if (player) {
        player.remove();
      }
    };
  }, [player]);

  // Reset configuration when selected model or ttsConfig changes
  useEffect(() => {
    if (ttsConfig) {
      // Reset to values from the predefined config or use defaults
      setNumThreads(ttsConfig.numThreads ?? 2);
      setDebugMode(ttsConfig.debug ?? false);
      setProvider(ttsConfig.provider ?? 'cpu');

      // Also reset generation-related settings
      setSpeakerId(0);
      setSpeakingRate(1.0);

      console.log('Reset configuration based on selected model:', selectedModelId);
    }
  }, [selectedModelId, ttsConfig]);

  // Auto-select the first downloaded model if none is selected
  useEffect(() => {
    if (downloadedModels.length > 0 && !selectedModelId) {
      setSelectedModelId(downloadedModels[0].metadata.id);
    }
  }, [downloadedModels, selectedModelId]);

  const handleModelSelect = (modelId: string) => {
    // If a model is already initialized, show confirmation before switching
    if (ttsInitialized) {
      setPendingModelId(modelId);
      Alert.alert(
        "Switch Model?",
        "Switching models will release the currently initialized model. Any generated speech will be lost.",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setPendingModelId(null)
          },
          {
            text: "Switch",
            style: "destructive",
            onPress: async () => {
              // Release current model first
              try {
                const result = await TTS.release();
                if (result.released) {
                  setTtsInitialized(false);
                  setInitResult(null);
                  setTtsResult(null);
                  setStatusMessage('TTS resources released, switching model');

                  // After release, set the new model ID
                  setSelectedModelId(modelId);
                  setPendingModelId(null);
                } else {
                  setErrorMessage('Failed to release TTS resources when switching models');
                  setPendingModelId(null);
                }
              } catch (error) {
                setErrorMessage(`Error releasing TTS: ${(error as Error).message}`);
                setPendingModelId(null);
              }
            }
          }
        ]
      );
    } else {
      // No model initialized, just switch directly
      setSelectedModelId(modelId);
    }
  };

  const handleInitTts = async () => {
    if (!selectedModelId) {
      setErrorMessage('Please select a model first');
      return;
    }

    if (!ttsConfig || !localPath || !isDownloaded) {
      setErrorMessage('Selected model is not valid or configuration not found.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('Initializing TTS...');

    try {
      // Use the cleaned path (without file://) for FileSystem operations and native module
      const cleanLocalPath = localPath.replace('file://', '');
      console.log(`Using model directory: ${cleanLocalPath}`);

      // Create configuration for TTS initialization based on model type and predefined config
      const modelConfig: TtsModelConfig = {
        modelDir: cleanLocalPath,
        ttsModelType: ttsConfig.ttsModelType || 'vits',
        modelFile: ttsConfig.modelFile || '',
        tokensFile: ttsConfig.tokensFile || '',
        ...ttsConfig,
        numThreads,
        debug: debugMode,
        provider,
      };

      console.log('FINAL TTS CONFIG:', JSON.stringify(modelConfig, null, 2));

      const result = await TTS.initialize(modelConfig);
      setInitResult(result);
      setTtsInitialized(result.success);

      if (result.success) {
        setStatusMessage(`TTS initialized successfully! Sample rate: ${result.sampleRate}Hz, Speakers: ${result.numSpeakers}`);
      } else {
        setErrorMessage(`TTS initialization failed: ${result.error}`);
      }

    } catch (error) {
      console.error('TTS init error:', error);
      setErrorMessage(`TTS init error: ${(error as Error).message}`);
      setTtsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTts = async () => {
    if (!ttsInitialized) {
      setErrorMessage('TTS must be initialized first');
      return;
    }

    if (!text.trim()) {
      setErrorMessage('Please enter text to speak');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('Generating speech...');

    try {
      const result = await TTS.generateSpeech(text, {
        speakerId,
        speakingRate,
        playAudio: autoPlay
      });

      // Success case - either we have a file path or the audio was played directly
      if (result.success || result.filePath) {
        setStatusMessage('Speech generated successfully!');

        if (result.filePath) {
          // Add file:// prefix if needed for Audio API
          const formattedPath = result.filePath.startsWith('file://')
            ? result.filePath
            : `file://${result.filePath}`;

          // Verify the file exists
          const fileExists = await verifyFileExists(formattedPath);

          if (fileExists) {
            console.log(`Generated audio file at: ${result.filePath}`);

            // Store the result
            setTtsResult(result);

            // If not auto-playing but we want to play manually, create and play the sound
            if (!autoPlay) {
              // Create a new player and prepare it for manual playback
              try {
                if (player) {
                  player.remove();
                }
                // Use formattedPath for Audio API
                const newPlayer = createAudioPlayer({ uri: formattedPath });
                setPlayer(newPlayer);

                // Setup playback status listener
                newPlayer.addListener('playbackStatusUpdate', (status) => {
                  setIsPlaying(status.playing);
                  if (status.didJustFinish) {
                    setIsPlaying(false);
                  }
                });

                setStatusMessage('Audio ready. Use the play button to listen.');
              } catch (audioError) {
                console.error('Error creating player:', audioError);
                setErrorMessage(`Error preparing audio: ${(audioError as Error).message}`);
              }
            }
          } else {
            console.error(`Generated audio file does not exist: ${formattedPath}`);
            // Create a basic error result with only valid fields
            setTtsResult({
              success: false,
              filePath: result.filePath
            });
            setErrorMessage('Generated audio file not found.');
          }
        } else if (autoPlay) {
          // Audio was played directly without saving to file
          setStatusMessage('Speech played successfully!');
        }
      } else {
        setErrorMessage('TTS generation failed');
      }
    } catch (error) {
      setErrorMessage(`TTS generation error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTts = async () => {
    try {
      console.log('Stopping TTS generation...');
      setStatusMessage('Stopping TTS...');

      // Call the stop API
      const result = await TTS.stopSpeech();
      console.log('Stop TTS result:', result);

      if (result.stopped) {
        setStatusMessage('TTS stopped successfully');
        // Force loading state to false
        setIsLoading(false);
      } else {
        // If the backend reports failure, show error message
        setErrorMessage(`Failed to stop TTS: ${result.message || 'Unknown error'}`);
        console.error('Failed to stop TTS:', result.message);
      }
    } catch (error) {
      const errorMsg = `Stop TTS error: ${(error as Error).message}`;
      console.error(errorMsg, error);
      setErrorMessage(errorMsg);
    } finally {
      // Always ensure loading state is reset
      setIsLoading(false);
    }
  };

  const handleReleaseTts = async () => {
    try {
      const result = await TTS.release();
      if (result.released) {
        setTtsInitialized(false);
        setInitResult(null);
        setTtsResult(null);
        setStatusMessage('TTS resources released');
      } else {
        setErrorMessage('Failed to release TTS resources');
      }
    } catch (error) {
      setErrorMessage(`Release TTS error: ${(error as Error).message}`);
    }
  };

  const handlePlayAudio = async () => {
    if (!ttsResult?.filePath) {
      setErrorMessage('No audio file available to play');
      return;
    }

    try {
      console.log('Attempting to play audio file:', ttsResult.filePath);

      // Format the path properly with file:// prefix
      const formattedPath = ttsResult.filePath.startsWith('file://')
        ? ttsResult.filePath
        : `file://${ttsResult.filePath}`;

      console.log('Formatted path for audio playback:', formattedPath);

      // Ensure audio mode is set up correctly
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'duckOthers',
      });

      // Always create a new player to ensure fresh playback
      if (player) {
        console.log('Removing existing player');
        player.remove();
      }

      console.log('Creating new audio player');
      const newPlayer = createAudioPlayer({ uri: formattedPath });

      newPlayer.addListener('playbackStatusUpdate', (status) => {
        setIsPlaying(status.playing);
        if (status.didJustFinish) {
          console.log('Audio playback finished');
          setIsPlaying(false);
        }
      });

      setPlayer(newPlayer);
      newPlayer.play();
      setIsPlaying(true);
      console.log('Audio playback started');

    } catch (error) {
      console.error('Error playing audio:', error);
      setErrorMessage(`Error playing audio: ${(error as Error).message}`);
    }
  };

  // Generate a visualization of the model's predefined config
  const predefinedConfigDisplay = selectedModelId && ttsConfig ? (
    <Section title="Predefined Model Configuration">
      <Text variant="bodySmall" selectable style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', backgroundColor: theme.colors.surfaceVariant, padding: 10, borderRadius: theme.roundness }}>
        {JSON.stringify(ttsConfig, null, 2)}
      </Text>
    </Section>
  ) : null;

  return (
    <PageContainer>
      <LoadingOverlay
        visible={isLoading}
        message={statusMessage || 'Processing...'}
        subMessage="This may take a moment, especially for longer text."
        onStop={handleStopTts}
      />

      {/* Error and status messages */}
      <StatusBlock status={statusMessage} error={errorMessage} />

      {/* Model Selection */}
      <Section title="1. Select TTS Model">
        {ttsInitialized && (
          <Text variant="bodySmall" style={{ color: theme.colors.warning ?? '#FF9800', textAlign: 'center', fontStyle: 'italic', marginBottom: theme.margin.s }}>
            Switching models will release the currently initialized model
          </Text>
        )}
        {downloadedModels.length === 0 ? (
          <InlineModelDownloader
            modelType="tts"
            emptyLabel="No TTS models downloaded."
            onModelDownloaded={(modelId) => setSelectedModelId(modelId)}
          />
        ) : (
          <>
            <ModelSelector
              models={downloadedModels}
              selectedId={selectedModelId}
              onSelect={handleModelSelect}
            />
            <TouchableOpacity onPress={() => router.push('/(tabs)/models?type=tts')} style={{ marginTop: theme.margin.s, alignItems: 'center' }}>
              <Text variant="labelMedium" style={{ color: theme.colors.primary }}>Download more models →</Text>
            </TouchableOpacity>
          </>
        )}
      </Section>

      {/* Show the predefined configuration after model selection */}
      {predefinedConfigDisplay}

      {/* TTS Configuration */}
      <Section title="2. TTS Configuration">
        <ConfigRow label="Number of Threads:">
          <TextInput
            style={{ padding: 8, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: theme.roundness, color: theme.colors.onSurface }}
            keyboardType="numeric"
            value={numThreads.toString()}
            onChangeText={(value) => {
              const threadCount = parseInt(value);
              if (!isNaN(threadCount) && threadCount > 0) {
                setNumThreads(threadCount);
              }
            }}
          />
        </ConfigRow>

        <ConfigRow label="Provider:">
          <View style={{ flexDirection: 'row', gap: theme.gap?.s ?? 8 }}>
            <ThemedButton
              label="CPU"
              variant={provider === 'cpu' ? 'primary' : 'secondary'}
              onPress={() => setProvider('cpu')}
              compact
            />
            <ThemedButton
              label="GPU"
              variant={provider === 'gpu' ? 'primary' : 'secondary'}
              onPress={() => setProvider('gpu')}
              compact
            />
          </View>
        </ConfigRow>

        <ConfigRow label="Debug Mode:">
          <Switch
            value={debugMode}
            onValueChange={setDebugMode}
          />
        </ConfigRow>
      </Section>

      {/* TTS Controls */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: theme.margin.m, gap: theme.gap?.s ?? 8 }}>
        <ThemedButton
          label="Initialize TTS"
          onPress={handleInitTts}
          disabled={isLoading || !selectedModelId}
          style={{ flex: 1 }}
        />
        <ThemedButton
          label="Release TTS"
          variant="secondary"
          onPress={handleReleaseTts}
          disabled={isLoading || !ttsInitialized}
          style={{ flex: 1 }}
        />
      </View>

      {/* Text input (only show if initialized) */}
      {ttsInitialized && (
        <>
          <TextInput
            style={{
              padding: theme.padding.m,
              minHeight: 100,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.roundness * 2,
              marginBottom: theme.margin.m,
              color: theme.colors.onSurface,
            }}
            multiline
            value={text}
            onChangeText={setText}
            placeholder="Enter text to speak"
            placeholderTextColor={theme.colors.onSurfaceVariant}
          />

          {/* TTS Generation Configuration */}
          <Section title="Speech Generation">
            {/* Speaker selector — only shown for multi-speaker models */}
            {initResult && initResult.numSpeakers > 1 && (
              <View style={{ marginBottom: theme.margin.m }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: theme.margin.s }}>
                  Speaker: {speakerId} of {initResult.numSpeakers - 1}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.gap?.s ?? 8 }}>
                  <ThemedButton
                    label="-"
                    onPress={() => setSpeakerId(Math.max(0, speakerId - 1))}
                    disabled={speakerId <= 0}
                    compact
                  />
                  <TextInput
                    style={{
                      flex: 1, padding: 8, borderWidth: 1, borderColor: theme.colors.outlineVariant,
                      borderRadius: theme.roundness, textAlign: 'center', color: theme.colors.onSurface,
                    }}
                    keyboardType="numeric"
                    value={speakerId.toString()}
                    onChangeText={(value) => {
                      const id = parseInt(value);
                      if (!isNaN(id)) {
                        setSpeakerId(Math.max(0, Math.min(id, initResult.numSpeakers - 1)));
                      }
                    }}
                  />
                  <ThemedButton
                    label="+"
                    onPress={() => setSpeakerId(Math.min(initResult.numSpeakers - 1, speakerId + 1))}
                    disabled={speakerId >= initResult.numSpeakers - 1}
                    compact
                  />
                  <ThemedButton
                    label="Random"
                    variant="warning"
                    onPress={() => setSpeakerId(Math.floor(Math.random() * initResult.numSpeakers))}
                    compact
                  />
                </View>
              </View>
            )}

            <ConfigRow label="Speaking Rate:">
              <TextInput
                style={{ padding: 8, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: theme.roundness, color: theme.colors.onSurface }}
                keyboardType="numeric"
                value={speakingRate.toString()}
                onChangeText={(value) => setSpeakingRate(parseFloat(value) || 1.0)}
              />
            </ConfigRow>

            <ConfigRow label="Auto-play Audio:">
              <Switch
                value={autoPlay}
                onValueChange={setAutoPlay}
              />
            </ConfigRow>
          </Section>

          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: theme.margin.m }}>
            <ThemedButton
              label="Generate Speech"
              variant="success"
              onPress={handleGenerateTts}
              disabled={isLoading}
              style={{ flex: 1 }}
            />
          </View>
        </>
      )}

      {/* TTS Status (only show if initialized) */}
      {initResult && (
        <Section title="TTS Status">
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>
            Initialized: {ttsInitialized ? 'Yes' : 'No'}
          </Text>
          {initResult.sampleRate && (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>
              Sample Rate: {initResult.sampleRate}Hz
            </Text>
          )}
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
            Speakers: {initResult.numSpeakers}
          </Text>
        </Section>
      )}

      {/* Generated Audio File Info */}
      {ttsResult && ttsResult.filePath && (
        <Section title="Generated Audio">
          <View style={{ marginBottom: theme.margin.m }}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>
              <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>File:</Text> {ttsResult.filePath.split('/').pop()}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Location:</Text> {ttsResult.filePath}
            </Text>
          </View>

          {/* Audio Player */}
          <View style={{ marginBottom: theme.margin.m }}>
            <Text variant="titleSmall" style={{ marginBottom: theme.margin.s }}>
              {isPlaying ? "Playing Audio..." : "Audio Ready To Play"}
            </Text>

            <View style={{ flexDirection: 'row', gap: theme.gap?.s ?? 8 }}>
              <ThemedButton
                label={isPlaying ? 'Playing...' : 'Play Audio'}
                onPress={handlePlayAudio}
                disabled={isPlaying}
                style={{ flex: 1 }}
              />

              {isPlaying ? (
                <ThemedButton
                  label="Stop"
                  variant="danger"
                  onPress={() => {
                    if (player) {
                      player.pause();
                      setIsPlaying(false);
                    }
                  }}
                />
              ) : (
                <ThemedButton
                  label="Reset"
                  variant="secondary"
                  onPress={() => {
                    if (player) {
                      // Reset the player to beginning
                      player.seekTo(0);
                    }
                  }}
                />
              )}
            </View>
          </View>
        </Section>
      )}
    </PageContainer>
  );
}
