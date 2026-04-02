import { Redirect } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from 'react-native'

import Moonshine, {
    type MoonshineIntentRecognizer,
} from '@siteed/moonshine.rn'
import type { AppTheme } from '@siteed/design-system'
import { Notice, ScreenWrapper, Text, useTheme } from '@siteed/design-system'

import { setAgenticPageState } from '../agentic-bridge'
import {
    getMoonshineIntentModelStatus,
    prepareMoonshineIntentModel,
    type MoonshineIntentModelStatus,
} from '../utils/moonshineIntentRuntime'

const DEFAULT_INTENTS = ['turn on the lights', 'turn off the lights', 'play some music']
const DEFAULT_UTTERANCE = 'please turn on the lights'
const DEFAULT_THRESHOLD = '0.6'

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
        statusCard: {
            gap: 6,
            padding: theme.padding.s,
            borderRadius: theme.roundness,
            backgroundColor: theme.colors.secondaryContainer,
        },
        statusText: {
            color: theme.colors.onSecondaryContainer,
        },
        input: {
            minHeight: 48,
            paddingHorizontal: theme.padding.s,
            paddingVertical: theme.padding.s,
            borderRadius: theme.roundness,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            backgroundColor: theme.colors.surfaceVariant,
            color: theme.colors.onSurface,
            textAlignVertical: 'top',
        },
        metricCard: {
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
        resultCard: {
            gap: 8,
            padding: theme.padding.s,
            borderRadius: theme.roundness,
            backgroundColor: theme.colors.primaryContainer,
        },
        resultText: {
            color: theme.colors.onPrimaryContainer,
        },
    })

function parseIntentList(value: string): string[] {
    return value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
}

export default function MoonshineIntentScreen() {
    if (!__DEV__) {
        return <Redirect href="/(tabs)/more" />
    }

    const platformStatus = Moonshine.getPlatformStatus()
    const theme = useTheme()
    const styles = useMemo(() => getStyles(theme), [theme])
    const [modelStatus, setModelStatus] = useState<MoonshineIntentModelStatus>({
        downloaded: false,
        localPath: null,
        variant: 'q4',
    })
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isPreparing, setIsPreparing] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [recognizer, setRecognizer] = useState<MoonshineIntentRecognizer | null>(
        null
    )
    const recognizerRef = useRef<MoonshineIntentRecognizer | null>(null)
    const [intentCount, setIntentCount] = useState<number | null>(null)
    const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD)
    const [intentsText, setIntentsText] = useState(DEFAULT_INTENTS.join('\n'))
    const [utterance, setUtterance] = useState(DEFAULT_UTTERANCE)
    const [matchText, setMatchText] = useState<string | null>(null)

    const refreshModelStatus = useCallback(async () => {
        const nextStatus = await getMoonshineIntentModelStatus('q4')
        setModelStatus(nextStatus)
    }, [])

    useEffect(() => {
        void refreshModelStatus()
    }, [refreshModelStatus])

    useEffect(() => {
        setAgenticPageState({
            route: '/moonshine-intent',
            status: {
                error,
                hasRecognizer: Boolean(recognizer),
                intentCount,
                isCreating,
                isPreparing,
                isProcessing,
                isSyncing,
                matchText,
                modelDownloaded: modelStatus.downloaded,
                statusMessage,
                threshold,
            },
        })
    }, [
        error,
        intentCount,
        isCreating,
        isPreparing,
        isProcessing,
        isSyncing,
        matchText,
        modelStatus.downloaded,
        recognizer,
        statusMessage,
        threshold,
    ])

    useEffect(() => {
        return () => {
            const activeRecognizer = recognizerRef.current
            recognizerRef.current = null
            void activeRecognizer?.release().catch(() => null)
        }
    }, [])

    const prepareModel = useCallback(async () => {
        setError(null)
        setIsPreparing(true)
        setStatusMessage('Preparing Moonshine intent model...')
        try {
            const nextStatus = await prepareMoonshineIntentModel({
                onStatus: setStatusMessage,
                variant: 'q4',
            })
            setModelStatus(nextStatus)
            setStatusMessage('Moonshine intent model is ready.')
        } catch (prepareError) {
            const message =
                prepareError instanceof Error
                    ? prepareError.message
                    : String(prepareError)
            setError(message)
            setStatusMessage('Moonshine intent model preparation failed.')
            throw prepareError
        } finally {
            setIsPreparing(false)
        }
    }, [])

    const syncRecognizerIntents = useCallback(
        async (nextRecognizer: MoonshineIntentRecognizer) => {
            setIsSyncing(true)
            try {
                const parsedThreshold = Number.parseFloat(threshold)
                const safeThreshold = Number.isFinite(parsedThreshold)
                    ? parsedThreshold
                    : 0.6
                await nextRecognizer.clearIntents()
                await nextRecognizer.setIntentThreshold(safeThreshold)
                for (const intent of parseIntentList(intentsText)) {
                    await nextRecognizer.registerIntent(intent)
                }
                const [nextIntentCount, nextThreshold] = await Promise.all([
                    nextRecognizer.getIntentCount(),
                    nextRecognizer.getIntentThreshold(),
                ])
                setIntentCount(nextIntentCount)
                setThreshold(String(nextThreshold))
                setStatusMessage(
                    `Moonshine intent recognizer is ready with ${nextIntentCount} intent(s).`
                )
            } finally {
                setIsSyncing(false)
            }
        },
        [intentsText, threshold]
    )

    const createRecognizer = useCallback(async () => {
        setError(null)
        setMatchText(null)
        setIsCreating(true)
        try {
            const nextModelStatus = modelStatus.downloaded
                ? modelStatus
                : await prepareMoonshineIntentModel({
                      onStatus: setStatusMessage,
                      variant: 'q4',
                  })
            setModelStatus(nextModelStatus)

            if (!nextModelStatus.localPath) {
                throw new Error('Moonshine intent model path is unavailable.')
            }

            const existingRecognizer = recognizerRef.current
            recognizerRef.current = null
            await existingRecognizer?.release().catch(() => null)
            const nextRecognizer = await Moonshine.createIntentRecognizer({
                modelArch: 'gemma-300m',
                modelPath: nextModelStatus.localPath,
                modelVariant: nextModelStatus.variant,
                threshold: Number.parseFloat(threshold) || 0.6,
            })
            recognizerRef.current = nextRecognizer
            setRecognizer(nextRecognizer)
            await syncRecognizerIntents(nextRecognizer)
        } catch (createError) {
            recognizerRef.current = null
            setRecognizer(null)
            setIntentCount(null)
            const message =
                createError instanceof Error
                    ? createError.message
                    : String(createError)
            setError(message)
            setStatusMessage('Moonshine intent recognizer setup failed.')
        } finally {
            setIsCreating(false)
        }
    }, [modelStatus, recognizer, syncRecognizerIntents, threshold])

    const releaseRecognizer = useCallback(async () => {
        setError(null)
        setMatchText(null)
        setIntentCount(null)
        setStatusMessage('Releasing Moonshine intent recognizer...')
        try {
            const activeRecognizer = recognizerRef.current
            recognizerRef.current = null
            await activeRecognizer?.release()
            setRecognizer(null)
            setStatusMessage('Moonshine intent recognizer released.')
        } catch (releaseError) {
            const message =
                releaseError instanceof Error
                    ? releaseError.message
                    : String(releaseError)
            setError(message)
            setStatusMessage('Moonshine intent recognizer release failed.')
        }
    }, [recognizer])

    const processUtterance = useCallback(async () => {
        if (!recognizer) {
            setError('Create the Moonshine intent recognizer first.')
            return
        }

        setError(null)
        setMatchText(null)
        setIsProcessing(true)
        setStatusMessage('Processing utterance with Moonshine intent recognizer...')
        try {
            const result = await recognizer.processUtterance(utterance)
            if (!result.matched || !result.match) {
                setMatchText('No intent matched the current utterance.')
                setStatusMessage('Moonshine did not match an intent.')
                return
            }

            setMatchText(
                `Matched "${result.match.triggerPhrase}" from "${result.match.utterance}" at ${Math.round(
                    result.match.similarity * 100
                )}%`
            )
            setStatusMessage('Moonshine intent matched the utterance.')
        } catch (processError) {
            const message =
                processError instanceof Error
                    ? processError.message
                    : String(processError)
            setError(message)
            setStatusMessage('Moonshine intent processing failed.')
        } finally {
            setIsProcessing(false)
        }
    }, [recognizer, utterance])

    if (!platformStatus.available) {
        return (
            <ScreenWrapper
                withScrollView
                useInsets={false}
                contentContainerStyle={styles.container}
            >
                <View style={styles.container}>
                    <Notice
                        message={platformStatus.reason ?? 'Moonshine is unavailable.'}
                        type="warning"
                    />
                </View>
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
                <Text style={styles.sectionTitle}>Moonshine Intent Demo</Text>
                <Text style={styles.body}>
                    This validates the direct JNI-backed intent recognizer using
                    Moonshine&apos;s `embeddinggemma-300m` command model.
                </Text>
            </View>

            {error ? <Notice message={error} type="error" /> : null}

            <View style={styles.statusCard}>
                <Text style={styles.statusText}>
                    {statusMessage ?? 'Moonshine intent recognizer is idle.'}
                </Text>
                <Text style={styles.statusText}>
                    Model: {modelStatus.downloaded ? 'Ready' : 'Not downloaded'}
                </Text>
                {modelStatus.localPath ? (
                    <Text style={styles.statusText}>{modelStatus.localPath}</Text>
                ) : null}
            </View>

            <View style={styles.row}>
                <Pressable
                    onPress={() => void prepareModel()}
                    style={[
                        styles.actionButton,
                        {
                            backgroundColor: theme.colors.primary,
                            opacity: isPreparing ? 0.6 : 1,
                        },
                    ]}
                    testID="moonshine-intent-prepare"
                >
                    <Text style={[styles.actionLabel, { color: theme.colors.onPrimary }]}>
                        {isPreparing ? 'Preparing...' : 'Download Model'}
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => void createRecognizer()}
                    style={[
                        styles.actionButton,
                        {
                            backgroundColor: theme.colors.secondary,
                            opacity: isCreating || isPreparing ? 0.6 : 1,
                        },
                    ]}
                    testID="moonshine-intent-create"
                >
                    <Text
                        style={[
                            styles.actionLabel,
                            { color: theme.colors.onSecondary },
                        ]}
                    >
                        {isCreating ? 'Creating...' : 'Create Recognizer'}
                    </Text>
                </Pressable>
                <Pressable
                    disabled={!recognizer}
                    onPress={() => void releaseRecognizer()}
                    style={[
                        styles.actionButton,
                        {
                            backgroundColor: theme.colors.error,
                            opacity: recognizer ? 1 : 0.5,
                        },
                    ]}
                    testID="moonshine-intent-release"
                >
                    <Text style={[styles.actionLabel, { color: theme.colors.onError }]}>
                        Release Recognizer
                    </Text>
                </Pressable>
            </View>

            <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Registered Intents</Text>
                <Text style={styles.metricValue}>
                    {intentCount == null ? 'n/a' : String(intentCount)}
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recognizer Settings</Text>
                <Text style={styles.metricLabel}>Threshold</Text>
                <TextInput
                    onChangeText={setThreshold}
                    style={styles.input}
                    testID="moonshine-intent-threshold"
                    value={threshold}
                />
                <Text style={styles.metricLabel}>Intent Phrases</Text>
                <TextInput
                    multiline
                    onChangeText={setIntentsText}
                    style={[styles.input, { minHeight: 120 }]}
                    testID="moonshine-intent-phrases"
                    value={intentsText}
                />
                <Pressable
                    disabled={!recognizer || isSyncing}
                    onPress={() =>
                        recognizer ? void syncRecognizerIntents(recognizer) : undefined
                    }
                    style={[
                        styles.actionButton,
                        {
                            backgroundColor: theme.colors.tertiary,
                            opacity: recognizer && !isSyncing ? 1 : 0.5,
                        },
                    ]}
                    testID="moonshine-intent-sync"
                >
                    <Text
                        style={[
                            styles.actionLabel,
                            { color: theme.colors.onTertiary },
                        ]}
                    >
                        {isSyncing ? 'Syncing...' : 'Sync Intents'}
                    </Text>
                </Pressable>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Utterance Test</Text>
                <TextInput
                    multiline
                    onChangeText={setUtterance}
                    style={[styles.input, { minHeight: 96 }]}
                    testID="moonshine-intent-utterance"
                    value={utterance}
                />
                <Pressable
                    disabled={!recognizer || isProcessing}
                    onPress={() => void processUtterance()}
                    style={[
                        styles.actionButton,
                        {
                            backgroundColor: theme.colors.primary,
                            opacity: recognizer && !isProcessing ? 1 : 0.5,
                        },
                    ]}
                    testID="moonshine-intent-process"
                >
                    <Text style={[styles.actionLabel, { color: theme.colors.onPrimary }]}>
                        {isProcessing ? 'Processing...' : 'Process Utterance'}
                    </Text>
                </Pressable>
            </View>

            <View style={styles.resultCard}>
                <Text style={styles.sectionTitle}>Result</Text>
                <Text style={styles.resultText}>
                    {matchText ?? 'No utterance has been processed yet.'}
                </Text>
            </View>
        </ScreenWrapper>
    )
}
