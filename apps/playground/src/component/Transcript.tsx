import React, { useRef, useEffect } from 'react'
import {
    View,
    ScrollView,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native'

import { TranscriberData } from '../hooks/useTranscriber'
import { formatDuration } from '../utils/utils'

interface Props {
    transcribedData: TranscriberData | undefined
}

export default function Transcript({ transcribedData }: Props) {
    const scrollViewRef = useRef<ScrollView>(null)

    const saveBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
    }

    const exportTXT = () => {
        const chunks = transcribedData?.chunks ?? []
        const text = chunks
            .map((chunk) => chunk.text)
            .join('')
            .trim()

        const blob = new Blob([text], { type: 'text/plain' })
        saveBlob(blob, 'transcript.txt')
    }

    const exportJSON = () => {
        let jsonData = JSON.stringify(transcribedData?.chunks ?? [], null, 2)

        // post-process the JSON to make it more readable
        const regex = /(    "timestamp": )\[\s+(\S+)\s+(\S+)\s+\]/gm
        jsonData = jsonData.replace(regex, '$1[$2 $3]')

        const blob = new Blob([jsonData], { type: 'application/json' })
        saveBlob(blob, 'transcript.json')
    }

    // Scroll to the bottom when the component updates
    useEffect(() => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true })
        }
    }, [transcribedData])

    return (
        <View style={styles.container}>
            <ScrollView ref={scrollViewRef} style={styles.scrollView}>
                {transcribedData?.chunks &&
                    transcribedData.chunks.map((chunk, i) => (
                        <View
                            key={`${i}-${chunk.text}`}
                            style={styles.chunkContainer}
                        >
                            <Text style={styles.timestamp}>
                                {formatDuration(chunk.timestamp[0])}
                            </Text>
                            <Text style={styles.chunkText}>{chunk.text}</Text>
                        </View>
                    ))}
            </ScrollView>
            {transcribedData && !transcribedData.isBusy && (
                <View style={styles.buttonContainer}>
                    <TouchableOpacity onPress={exportTXT} style={styles.button}>
                        <Text style={styles.buttonText}>Export TXT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={exportJSON}
                        style={styles.button}
                    >
                        <Text style={styles.buttonText}>Export JSON</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        flex: 1,
        padding: 16,
        maxHeight: 320, // Equivalent to 20rem
    },
    scrollView: {
        flex: 1,
    },
    chunkContainer: {
        flexDirection: 'row',
        marginBottom: 8,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 16,
        shadowColor: '#000000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 1,
    },
    timestamp: {
        marginRight: 16,
    },
    chunkText: {
        flex: 1,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 8,
    },
    button: {
        backgroundColor: '#10B981',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginLeft: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#ffffff',
    },
})
