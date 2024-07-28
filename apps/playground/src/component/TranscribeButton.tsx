import React from 'react'
import {
    TouchableOpacity,
    View,
    Text,
    ActivityIndicator,
    StyleSheet,
    GestureResponderEvent,
} from 'react-native'

interface Props {
    isModelLoading: boolean
    isTranscribing: boolean
    onClick?: (event: GestureResponderEvent) => void
    // other button props if needed
}

export function TranscribeButton(props: Props): JSX.Element {
    const { isModelLoading, isTranscribing, onClick, ...buttonProps } = props

    return (
        <TouchableOpacity
            {...buttonProps}
            onPress={(event) => {
                if (onClick && !isTranscribing && !isModelLoading) {
                    onClick(event)
                }
            }}
            disabled={isTranscribing}
            style={[styles.button, isTranscribing ? styles.buttonDisabled : {}]}
        >
            {isModelLoading ? (
                <Spinner text="Loading model..." />
            ) : isTranscribing ? (
                <Spinner text="Transcribing..." />
            ) : (
                <Text style={styles.buttonText}>Transcribe Audio</Text>
            )}
        </TouchableOpacity>
    )
}

export function Spinner(props: { text: string }): JSX.Element {
    return (
        <View style={styles.spinnerContainer}>
            <ActivityIndicator
                size="small"
                color="#ffffff"
                style={styles.spinner}
            />
            <Text style={styles.spinnerText}>{props.text}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#1D4ED8',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 8,
    },
    buttonDisabled: {
        backgroundColor: '#3B82F6',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 14,
    },
    spinnerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    spinner: {
        marginRight: 8,
    },
    spinnerText: {
        color: '#ffffff',
        fontSize: 14,
    },
})
