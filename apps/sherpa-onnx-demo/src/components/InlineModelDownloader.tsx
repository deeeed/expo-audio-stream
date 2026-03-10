import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, TouchableOpacity, View } from 'react-native';
import { useModelManagement } from '../contexts/ModelManagement';
import type { ModelType } from '../utils/models';
import { formatBytes } from '../utils/formatters';
import { Text, ThemedButton, useTheme } from './ui';

interface InlineModelDownloaderProps {
  modelType: ModelType;
  onModelDownloaded: (modelId: string) => void;
  /** Optional additional label shown above the download button */
  emptyLabel?: string;
}

export function InlineModelDownloader({
  modelType,
  onModelDownloaded,
  emptyLabel,
}: InlineModelDownloaderProps) {
  const [visible, setVisible] = React.useState(false);
  const [activeDownloadIds, setActiveDownloadIds] = useState<Set<string>>(new Set());
  const pendingRef = useRef<Set<string>>(new Set());
  const prevStatusRef = useRef<Record<string, string>>({});
  const theme = useTheme();
  const { getAvailableModels, modelsState, downloadModel, cancelDownload } =
    useModelManagement();

  const models = React.useMemo(
    () => getAvailableModels().filter((m) => m.type === modelType),
    [getAvailableModels, modelType],
  );

  // Detect transitions from downloading/extracting → downloaded
  useEffect(() => {
    const prev = prevStatusRef.current;
    let changed = false;
    for (const [id, state] of Object.entries(modelsState)) {
      if (pendingRef.current.has(id)) {
        const isActive = state.status === 'downloading' || state.status === 'extracting';
        if (state.status === 'downloaded' && prev[id] !== 'downloaded') {
          pendingRef.current.delete(id);
          setActiveDownloadIds(s => { const n = new Set(s); n.delete(id); return n; });
          setVisible(false);
          onModelDownloaded(id);
          changed = true;
        } else if (isActive) {
          setActiveDownloadIds(s => { if (s.has(id)) return s; const n = new Set(s); n.add(id); return n; });
        }
      }
    }
    // Update previous status snapshot
    for (const [id, state] of Object.entries(modelsState)) {
      prev[id] = state.status;
    }
    // suppress lint warning for `changed`
    void changed;
  }, [modelsState, onModelDownloaded]);

  const handleDownload = useCallback(
    (modelId: string) => {
      pendingRef.current.add(modelId);
      setActiveDownloadIds(s => { const n = new Set(s); n.add(modelId); return n; });
      downloadModel(modelId);
    },
    [downloadModel],
  );

  // Active downloads from this component (outside modal)
  const inProgressDownloads = Array.from(activeDownloadIds)
    .map(id => ({ id, model: models.find(m => m.id === id), state: modelsState[id] }))
    .filter(({ state }) => state?.status === 'downloading' || state?.status === 'extracting');

  return (
    <View style={{ alignItems: 'center', paddingVertical: theme.padding.m }}>
      <Text
        variant="bodyMedium"
        style={{
          color: theme.colors.onSurfaceVariant,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        {emptyLabel ?? 'No models downloaded yet.'}
      </Text>
      <ThemedButton
        label="Download a Model"
        variant="primary"
        onPress={() => setVisible(true)}
      />

      {/* Persistent progress shown even when modal is closed */}
      {inProgressDownloads.map(({ id, model: m, state }) => (
        <View key={id} style={{ width: '100%', marginTop: 12 }}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
            {state?.status === 'extracting' ? `Extracting ${m?.name ?? id}…` : `Downloading ${m?.name ?? id}…`}
          </Text>
          {state?.status === 'downloading' && (
            <>
              <View style={{ height: 4, backgroundColor: theme.colors.outlineVariant, borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: theme.colors.primary, width: `${Math.round((state.progress ?? 0) * 100)}%` }} />
              </View>
              <Text variant="labelSmall" style={{ color: theme.colors.primary, marginTop: 2, alignSelf: 'flex-end' }}>
                {Math.round((state.progress ?? 0) * 100)}%
              </Text>
            </>
          )}
        </View>
      ))}

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: '80%',
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text
                variant="titleMedium"
                style={{ flex: 1, color: theme.colors.onSurface }}
              >
                Download a Model
              </Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text
                  variant="labelLarge"
                  style={{ color: theme.colors.primary }}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {models.map((model) => {
                const state = modelsState[model.id];
                const isDownloading = state?.status === 'downloading';
                const isExtracting = state?.status === 'extracting';
                const isDownloaded = state?.status === 'downloaded';
                const progress = state?.progress ?? 0;

                return (
                  <View
                    key={model.id}
                    style={{
                      padding: 14,
                      marginBottom: 10,
                      backgroundColor: theme.colors.surfaceVariant,
                      borderRadius: theme.roundness * 2,
                      borderWidth: model.recommended ? 1.5 : 0,
                      borderColor: model.recommended
                        ? theme.colors.primary
                        : 'transparent',
                    }}
                  >
                    <View
                      style={{ flexDirection: 'row', alignItems: 'flex-start' }}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 6,
                          }}
                        >
                          <Text
                            variant="bodyMedium"
                            style={{
                              fontWeight: '600',
                              color: theme.colors.onSurface,
                            }}
                          >
                            {model.name}
                          </Text>
                          {model.recommended && (
                            <View
                              style={{
                                paddingHorizontal: 6,
                                paddingVertical: 1,
                                backgroundColor: theme.colors.primary,
                                borderRadius: 8,
                              }}
                            >
                              <Text
                                variant="labelSmall"
                                style={{ color: '#fff' }}
                              >
                                Recommended
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text
                          variant="bodySmall"
                          style={{
                            color: theme.colors.onSurfaceVariant,
                            marginTop: 2,
                            lineHeight: 18,
                          }}
                        >
                          {model.description}
                        </Text>
                        <Text
                          variant="labelSmall"
                          style={{
                            color: theme.colors.onSurfaceVariant,
                            marginTop: 4,
                          }}
                        >
                          {formatBytes(model.size)} · {model.language}
                        </Text>
                      </View>

                      {isDownloaded ? (
                        <ThemedButton
                          label="Use"
                          variant="success"
                          compact
                          onPress={() => {
                            setVisible(false);
                            onModelDownloaded(model.id);
                          }}
                        />
                      ) : isDownloading || isExtracting ? (
                        <ThemedButton
                          label="Cancel"
                          variant="danger"
                          compact
                          onPress={() => cancelDownload(model.id)}
                        />
                      ) : (
                        <ThemedButton
                          testID={`download-model-${model.id}`}
                          label="Download"
                          variant="primary"
                          compact
                          onPress={() => handleDownload(model.id)}
                        />
                      )}
                    </View>

                    {isDownloading && (
                      <View style={{ marginTop: 8 }}>
                        <View
                          style={{
                            height: 4,
                            backgroundColor: theme.colors.outlineVariant,
                            borderRadius: 2,
                            overflow: 'hidden',
                          }}
                        >
                          <View
                            style={{
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: theme.colors.primary,
                              width: `${Math.round(progress * 100)}%`,
                            }}
                          />
                        </View>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            marginTop: 4,
                          }}
                        >
                          <Text
                            variant="labelSmall"
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            {formatBytes(state?.bytesWritten ?? 0)} /{' '}
                            {formatBytes(model.size)}
                          </Text>
                          <Text
                            variant="labelSmall"
                            style={{ color: theme.colors.primary }}
                          >
                            {Math.round(progress * 100)}%
                          </Text>
                        </View>
                      </View>
                    )}
                    {isExtracting && (
                      <Text
                        variant="labelSmall"
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          marginTop: 6,
                          fontStyle: 'italic',
                        }}
                      >
                        Extracting archive...
                      </Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
