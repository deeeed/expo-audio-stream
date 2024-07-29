import { Button } from '@siteed/design-system'
import React, { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { ProgressItems } from '../../component/ProgressItems'
import { useTranscription } from '../../context/TranscriptionProvider'
import { TranscriptionState } from '../../context/TranscriptionProvider.types'

export type SelectedTranscriptionProps = Pick<
    TranscriptionState,
    'model' | 'language' | 'quantized'
>

const getStyles = () => {
    return StyleSheet.create({
        container: {},
    })
}

const TranscriptionScreen = () => {
    const styles = useMemo(() => getStyles(), [])
    const {
        isModelLoading,
        initialize,
        isBusy,
        ready,
        model,
        progressItems,
        quantized,
    } = useTranscription()

    return (
        <View style={styles.container}>
            {isModelLoading && <ProgressItems items={progressItems} />}

            {!ready && !isModelLoading && (
                <View>
                    <Button onPress={initialize} mode="contained">
                        Initialize
                    </Button>
                </View>
            )}
            <Text>Model: {model}</Text>
            <Text>Ready: {ready ? 'YES' : 'NO'}</Text>
            <Text>Quantized: {quantized ? 'Yes' : 'No'}</Text>
            <Text>Is busy: {isBusy ? 'Yes' : 'No'}</Text>
            <Text>Transcription screen</Text>
        </View>
    )
}

export default TranscriptionScreen
