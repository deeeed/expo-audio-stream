import {
    Button,
    EditableInfoCard,
    Notice,
    ScreenWrapper,
    useModal,
    useToast,
} from '@siteed/design-system'
import React, { useCallback, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { ProgressItems } from '../component/ProgressItems'
import {
    TranscriptionConfigFormState,
    TranscriptionConfigForm,
} from '../component/TranscriptionConfigForm'
import { baseLogger } from '../config'
import { useTranscription } from '../context/TranscriptionProvider'

const logger = baseLogger.extend('TranscriptionScreen')

const getStyles = () => {
    return StyleSheet.create({
        container: { gap: 10, padding: 10 },
    })
}

const TranscriptionScreen = () => {
    const styles = useMemo(() => getStyles(), [])
    const {
        isModelLoading,
        initialize,
        isBusy,
        multilingual,
        language,
        ready,
        model,
        progressItems,
        quantized,
        updateConfig,
    } = useTranscription()
    const [selectedAnalysisConfig, setSelectedAnalysisConfig] =
        useState<TranscriptionConfigFormState>({
            model,
            multilingual,
            quantized,
            language,
            subtask: 'transcribe',
            tdrz: false,
        })
    const { openDrawer, dismiss } = useModal()
    const { show } = useToast()

    const hasEditedConfig = useMemo(() => {
        // compare each value of the config to actual values
        if (selectedAnalysisConfig.model !== model) return true
        if (selectedAnalysisConfig.multilingual !== multilingual) return true
        if (selectedAnalysisConfig.quantized !== quantized) return true
        if (selectedAnalysisConfig.language !== language) return true
        return false
    }, [selectedAnalysisConfig, model, multilingual, quantized, language])

    const handlleReinitialize = useCallback(async () => {
        try {
            await updateConfig(selectedAnalysisConfig, true)
        } catch (error) {
            logger.error(`Failed to update config`, error)
            show({ type: 'error', message: 'Failed to update config' })
        }
    }, [selectedAnalysisConfig, show, updateConfig])

    return (
        <ScreenWrapper contentContainerStyle={styles.container}>
            {isModelLoading && <ProgressItems items={progressItems} />}

            {!ready && !hasEditedConfig && !isModelLoading && (
                <View>
                    <Button onPress={() => initialize()} mode="contained">
                        Initialize
                    </Button>
                </View>
            )}
            <Text>Model: {model}</Text>
            <Text>Ready: {ready ? 'YES' : 'NO'}</Text>
            <Text>Quantized: {quantized ? 'Yes' : 'No'}</Text>
            <Text>Is busy: {isBusy ? 'Yes' : 'No'}</Text>
            <Text>Transcription screen</Text>
            <EditableInfoCard
                label="Transcription Config"
                value={JSON.stringify(selectedAnalysisConfig)}
                editable
                onEdit={async () => {
                    openDrawer({
                        bottomSheetProps: {
                            enableDynamicSizing: true,
                        },
                        render: () => (
                            <TranscriptionConfigForm
                                config={selectedAnalysisConfig}
                                onChange={(config) => {
                                    setSelectedAnalysisConfig(config)
                                    dismiss()
                                }}
                            />
                        ),
                    })
                }}
            />
            {hasEditedConfig && (
                <View style={{ padding: 10, gap: 5 }}>
                    <Notice
                        type="info"
                        title="Transcription Config"
                        message="Your configuration has changed and model needs to be re-initialized."
                    />
                    <Button onPress={handlleReinitialize} mode="contained">
                        Reinitialize
                    </Button>
                </View>
            )}
        </ScreenWrapper>
    )
}

export default TranscriptionScreen
