import { Redirect } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import Moonshine, { type MoonshineTranscriptLine } from '@siteed/moonshine.rn'
import type { AppTheme } from '@siteed/design-system'
import {
    Notice,
    ScreenWrapper,
    Text,
    useTheme,
} from '@siteed/design-system'

import { setAgenticPageState } from '../agentic-bridge'
import {
    type MoonshineLiveStrategy,
    useMoonshineLiveSession,
} from '../hooks/useMoonshineLiveSession'

const getStyles = (theme: AppTheme) =>
    StyleSheet.create({
        container: {
            gap: theme.spacing.gap,
            paddingHorizontal: theme.padding.s,
            paddingBottom: theme.padding.l,
            paddingTop: theme.padding.s,
        },
        section: {
            gap: theme.spacing.gap,
            padding: theme.padding.s,
            borderRadius: theme.roundness,
            backgroundColor: theme.colors.surface,
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: '700',
            color: theme.colors.onSurface,
        },
        body: {
            color: theme.colors.onSurfaceVariant,
        },
        row: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.gap,
        },
        actionButton: {
            minWidth: 140,
            paddingHorizontal: theme.padding.m,
            paddingVertical: theme.padding.s,
            borderRadius: theme.roundness,
            alignItems: 'center',
            justifyContent: 'center',
        },
        actionLabel: {
            fontWeight: '700',
        },
        metricCard: {
            flexGrow: 1,
            minWidth: 140,
            gap: 6,
            padding: theme.padding.s,
            borderRadius: theme.roundness,
            backgroundColor: theme.colors.surfaceVariant,
        },
        metricLabel: {
            fontSize: 12,
            color: theme.colors.onSurfaceVariant,
        },
        metricValue: {
            fontSize: 18,
            fontWeight: '700',
            color: theme.colors.onSurface,
        },
        statusCard: {
            gap: 6,
            padding: theme.padding.s,
            borderRadius: theme.roundness,
            backgroundColor: theme.colors.secondaryContainer,
        },
        statusText: {
            color: theme.colors.onSecondaryContainer,
        },
        transcriptCard: {
            gap: 8,
            padding: theme.padding.s,
            borderRadius: theme.roundness,
            backgroundColor: theme.colors.primaryContainer,
        },
        transcriptText: {
            color: theme.colors.onPrimaryContainer,
        },
        subtleCard: {
            gap: 6,
            padding: theme.padding.s,
            borderRadius: theme.roundness,
            backgroundColor: theme.colors.surfaceVariant,
        },
        subtleValue: {
            color: theme.colors.onSurface,
        },
        strategyButton: {
            minWidth: 160,
            paddingHorizontal: theme.padding.m,
            paddingVertical: theme.padding.s,
            borderRadius: theme.roundness,
            alignItems: 'center',
            justifyContent: 'center',
        },
        speakerLineCard: {
            gap: 4,
            padding: theme.padding.s,
            borderRadius: theme.roundness,
            backgroundColor: theme.colors.surfaceVariant,
        },
        speakerLineHeader: {
            fontSize: 12,
            fontWeight: '700',
            color: theme.colors.onSurfaceVariant,
        },
        speakerLineText: {
            color: theme.colors.onSurface,
        },
    })

function formatMs(value?: number | null): string {
    if (value == null) return 'n/a'
    return `${Math.round(value)} ms`
}

function getSpeakerLabel(line: MoonshineTranscriptLine): string {
    if (line.hasSpeakerId && typeof line.speakerIndex === 'number') {
        return `Cluster ${line.speakerIndex + 1}`
    }
    if (line.hasSpeakerId && line.speakerId) {
        return `Cluster ${line.speakerId}`
    }
    return 'Unclustered turn'
}

function StatusRow({
    label,
    downloaded,
    localPath,
}: {
    label: string
    downloaded: boolean
    localPath: string | null
}) {
    const theme = useTheme()
    const styles = useMemo(() => getStyles(theme), [theme])

    return (
        <View style={styles.subtleCard}>
            <Text>{label}</Text>
            <Text style={styles.subtleValue}>
                {downloaded ? 'Ready' : 'Not downloaded'}
            </Text>
            {localPath ? (
                <Text style={styles.metricLabel}>{localPath}</Text>
            ) : null}
        </View>
    )
}

function SpeakerLineList({
    emptyText,
    lines,
}: {
    emptyText: string
    lines: MoonshineTranscriptLine[]
}) {
    const theme = useTheme()
    const styles = useMemo(() => getStyles(theme), [theme])

    if (lines.length === 0) {
        return (
            <View style={styles.transcriptCard}>
                <Text style={styles.transcriptText}>{emptyText}</Text>
            </View>
        )
    }

    return (
        <View style={styles.section}>
            {lines.map((line) => (
                <View
                    key={`${line.lineId}-${line.completedAtMs ?? line.startedAtMs ?? 0}`}
                    style={styles.speakerLineCard}
                >
                    <Text style={styles.speakerLineHeader}>
                        {getSpeakerLabel(line)}
                        {line.startedAtMs != null
                            ? ` • ${formatMs(line.startedAtMs)}`
                            : ''}
                    </Text>
                    <Text style={styles.speakerLineText}>
                        {line.text || 'No text yet.'}
                    </Text>
                </View>
            ))}
        </View>
    )
}

export default function MoonshineLiveScreen() {
    if (!__DEV__) {
        return <Redirect href="/(tabs)/more" />
    }

    const platformStatus = Moonshine.getPlatformStatus()
    const theme = useTheme()
    const styles = useMemo(() => getStyles(theme), [theme])
    const [strategy, setStrategy] = useState<MoonshineLiveStrategy>('small-only')
    const {
        clear,
        error,
        finalTranscript,
        isBusy,
        isPreparingModels,
        isRecording,
        isStarting,
        isStopping,
        liveCommittedLines,
        liveCommittedText,
        liveInitMs,
        liveInterimLines,
        liveInterimText,
        lastRecording,
        mediumModelStatus,
        prepareModels,
        smallModelStatus,
        startSession,
        statusMessage,
        stopSession,
    } = useMoonshineLiveSession({ strategy })

    useEffect(() => {
        setAgenticPageState({
            route: '/moonshine-live',
            strategy,
            platformAvailable: platformStatus.available,
            platformReason: platformStatus.reason ?? null,
            liveModelDownloaded:
                strategy === 'medium-only'
                    ? mediumModelStatus.downloaded
                    : smallModelStatus.downloaded,
            finalModelDownloaded:
                strategy === 'medium-only'
                    ? mediumModelStatus.downloaded
                    : smallModelStatus.downloaded,
            isBusy,
            isPreparingModels,
            isRecording,
            isStarting,
            isStopping,
            liveInitMs,
            liveCommittedLineCount: liveCommittedLines.length,
            liveCommittedText: liveCommittedText || null,
            liveInterimLineCount: liveInterimLines.length,
            liveInterimText: liveInterimText || null,
            finalTranscript: finalTranscript || null,
            statusMessage: statusMessage || null,
            error: error || null,
            recordingFileUri: lastRecording?.fileUri ?? null,
            recordingDurationMs: lastRecording?.durationMs ?? null,
        })
    }, [
        error,
        finalTranscript,
        isBusy,
        isPreparingModels,
        isRecording,
        isStarting,
        isStopping,
        lastRecording?.durationMs,
        lastRecording?.fileUri,
        liveCommittedText,
        liveCommittedLines.length,
        liveInitMs,
        liveInterimText,
        liveInterimLines.length,
        mediumModelStatus.downloaded,
        platformStatus.available,
        platformStatus.reason,
        smallModelStatus.downloaded,
        statusMessage,
        strategy,
    ])

    if (!platformStatus.available) {
        return (
            <ScreenWrapper
                withScrollView
                useInsets={false}
                contentContainerStyle={styles.container}
            >
                <Notice
                    type="warning"
                    title="Moonshine unavailable"
                    message={
                        platformStatus.reason ??
                        'Moonshine is not available in this build.'
                    }
                />
            </ScreenWrapper>
        )
    }

    return (
        <ScreenWrapper
            withScrollView
            useInsets={false}
            contentContainerStyle={styles.container}
        >
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Moonshine Live Demo</Text>
                <Text style={styles.body}>
                    {strategy === 'medium-only'
                        ? 'This page uses Moonshine medium directly for both live transcription and final text.'
                        : 'This page uses Moonshine small directly for both live transcription and final text.'}
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Strategy</Text>
                <Text style={styles.body}>
                    Use small-only to check whether the device can sustain live transcription comfortably. Use medium-only to see the quality and latency tradeoff of the heavier model.
                </Text>
                <View style={styles.row}>
                    <Pressable
                        testID="moonshine-live-strategy-small-only"
                        accessibilityRole="button"
                        disabled={isBusy || isRecording}
                        onPress={() => setStrategy('small-only')}
                        style={[
                            styles.strategyButton,
                            {
                                backgroundColor:
                                    strategy === 'small-only'
                                        ? theme.colors.primary
                                        : theme.colors.surfaceVariant,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.actionLabel,
                                {
                                    color:
                                        strategy === 'small-only'
                                            ? theme.colors.onPrimary
                                            : theme.colors.onSurface,
                                },
                            ]}
                        >
                            Small Only
                        </Text>
                    </Pressable>
                    <Pressable
                        testID="moonshine-live-strategy-medium-only"
                        accessibilityRole="button"
                        disabled={isBusy || isRecording}
                        onPress={() => setStrategy('medium-only')}
                        style={[
                            styles.strategyButton,
                            {
                                backgroundColor:
                                    strategy === 'medium-only'
                                        ? theme.colors.primary
                                        : theme.colors.surfaceVariant,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.actionLabel,
                                {
                                    color:
                                        strategy === 'medium-only'
                                            ? theme.colors.onPrimary
                                            : theme.colors.onSurface,
                                },
                            ]}
                        >
                            Medium Only
                        </Text>
                    </Pressable>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Models</Text>
                <StatusRow
                    label={
                        strategy === 'medium-only'
                            ? 'Live model • Moonshine Medium'
                            : 'Live model • Moonshine Small'
                    }
                    downloaded={
                        strategy === 'medium-only'
                            ? mediumModelStatus.downloaded
                            : smallModelStatus.downloaded
                    }
                    localPath={
                        strategy === 'medium-only'
                            ? mediumModelStatus.localPath
                            : smallModelStatus.localPath
                    }
                />
                <View style={styles.row}>
                    <Pressable
                        testID="moonshine-live-prepare-models"
                        accessibilityRole="button"
                        disabled={isBusy}
                        onPress={() => void prepareModels()}
                        style={[
                            styles.actionButton,
                            {
                                backgroundColor: isBusy
                                    ? theme.colors.surfaceVariant
                                    : theme.colors.secondaryContainer,
                            },
                        ]}
                    >
                        <Text style={[styles.actionLabel, { color: theme.colors.onSecondaryContainer }]}>
                            {isPreparingModels
                                ? 'Preparing…'
                                : strategy === 'medium-only'
                                  ? 'Prepare Medium'
                                  : 'Prepare Small'}
                        </Text>
                    </Pressable>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Controls</Text>
                <View style={styles.row}>
                    <Pressable
                        testID="moonshine-live-start"
                        accessibilityRole="button"
                        disabled={isBusy || isRecording}
                        onPress={() => void startSession()}
                        style={[
                            styles.actionButton,
                            {
                                backgroundColor:
                                    isBusy || isRecording
                                        ? theme.colors.surfaceVariant
                                        : theme.colors.primary,
                            },
                        ]}
                    >
                        <Text style={[styles.actionLabel, { color: theme.colors.onPrimary }]}>
                            {isStarting ? 'Starting…' : 'Start Live'}
                        </Text>
                    </Pressable>
                    <Pressable
                        testID="moonshine-live-stop"
                        accessibilityRole="button"
                        disabled={isBusy || !isRecording}
                        onPress={() => void stopSession()}
                        style={[
                            styles.actionButton,
                            {
                                backgroundColor:
                                    isBusy || !isRecording
                                        ? theme.colors.surfaceVariant
                                        : theme.colors.errorContainer,
                            },
                        ]}
                    >
                        <Text style={[styles.actionLabel, { color: theme.colors.onErrorContainer }]}>
                            {isStopping ? 'Stopping…' : 'Stop'}
                        </Text>
                    </Pressable>
                    <Pressable
                        testID="moonshine-live-clear"
                        accessibilityRole="button"
                        disabled={isRecording}
                        onPress={clear}
                        style={[
                            styles.actionButton,
                            {
                                backgroundColor: theme.colors.tertiaryContainer,
                            },
                        ]}
                    >
                        <Text style={[styles.actionLabel, { color: theme.colors.onTertiaryContainer }]}>
                            Clear
                        </Text>
                    </Pressable>
                </View>
            </View>

            {(statusMessage || error) && (
                <View style={styles.statusCard}>
                    {statusMessage ? (
                        <Text style={styles.statusText}>{statusMessage}</Text>
                    ) : null}
                    {error ? (
                        <Text style={styles.statusText}>Error: {error}</Text>
                    ) : null}
                </View>
            )}

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Metrics</Text>
                <View style={styles.row}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Live model init</Text>
                        <Text style={styles.metricValue}>{formatMs(liveInitMs)}</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>
                            Finalization
                        </Text>
                        <Text style={styles.metricValue}>
                            Live only
                        </Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>
                            Final transcript
                        </Text>
                        <Text style={styles.metricValue}>
                            From live
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Live Transcript</Text>
                <View style={styles.transcriptCard}>
                    <Text style={styles.metricLabel}>Committed</Text>
                    <Text style={styles.transcriptText}>
                        {liveCommittedText || 'No committed transcript yet.'}
                    </Text>
                </View>
                <View style={styles.transcriptCard}>
                    <Text style={styles.metricLabel}>Interim</Text>
                    <Text style={styles.transcriptText}>
                        {liveInterimText || 'No interim text yet.'}
                    </Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Speaker-Turn Hints</Text>
                <Text style={styles.body}>
                    Moonshine speaker identification is still experimental. Treat these as tentative turn clusters, not trusted speaker identities or final diarization.
                </Text>
                <Text style={styles.metricLabel}>Committed turn hints</Text>
                <SpeakerLineList
                    emptyText="No committed speaker-turn hints yet."
                    lines={liveCommittedLines}
                />
                <Text style={styles.metricLabel}>Current live turn hints</Text>
                <SpeakerLineList
                    emptyText="No active speaker-turn hint yet."
                    lines={liveInterimLines}
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Final Transcript</Text>
                <View style={styles.transcriptCard}>
                    <Text style={styles.transcriptText}>
                        {finalTranscript ||
                            (strategy === 'medium-only'
                                ? 'Stop a live session to keep the transcript from Moonshine medium.'
                                : 'Stop a live session to keep the transcript from Moonshine small.')}
                    </Text>
                </View>
                {lastRecording ? (
                    <View style={styles.subtleCard}>
                        <Text style={styles.metricLabel}>Saved recording</Text>
                        <Text style={styles.subtleValue}>{lastRecording.fileUri}</Text>
                        <Text style={styles.metricLabel}>
                            Duration {Math.round(lastRecording.durationMs)} ms
                        </Text>
                    </View>
                ) : null}
            </View>
        </ScreenWrapper>
    )
}
