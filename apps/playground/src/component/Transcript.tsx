import React, { useEffect, useRef } from 'react'
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'

import { Chunk, TranscriberData } from '../context/TranscriberContext'
import { formatDuration } from '../utils/utils'

interface TranscriptProps {
    transcribedData: TranscriberData | TranscriberData[] | undefined
    showActions?: boolean
    onSelectChunk?: (timestamp: Chunk['timestamp']) => void
}

export default function Transcript({
    transcribedData,
    onSelectChunk,
    showActions = true,
}: TranscriptProps) {
    const scrollViewRef = useRef<ScrollView>(null)

    const saveBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
    }

    const getCombinedChunks = (): string => {
        if (!transcribedData) return ''

        const chunks = Array.isArray(transcribedData)
            ? transcribedData.flatMap((data) => data.chunks)
            : transcribedData.chunks

        return chunks
            .map((chunk) => chunk.text)
            .join('')
            .trim()
    }

    const exportTXT = () => {
        const text = getCombinedChunks()
        const blob = new Blob([text], { type: 'text/plain' })
        saveBlob(blob, 'transcript.txt')
    }

    const exportJSON = () => {
        const chunks = Array.isArray(transcribedData)
            ? transcribedData.flatMap((data) => data.chunks)
            : (transcribedData?.chunks ?? [])

        let jsonData = JSON.stringify(chunks, null, 2)

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

    const renderChunks = (chunks: Chunk[]) => {
        return chunks.map((chunk, i) => (
            <TouchableOpacity
                key={`${i}-${chunk.text}`}
                onPress={() => handleChunkPress(chunk.timestamp)}
                style={styles.chunkContainer}
            >
                <Text style={styles.timestamp}>
                    {formatDuration(chunk.timestamp[0])}
                </Text>
                <Text style={styles.chunkText}>{chunk.text}</Text>
            </TouchableOpacity>
        ))
    }

    const handleChunkPress = (timestamp: Chunk['timestamp']) => {
        if (onSelectChunk) {
            onSelectChunk(timestamp)
        }
    }

    const chunks = Array.isArray(transcribedData)
        ? transcribedData.flatMap((data) => data.chunks)
        : (transcribedData?.chunks ?? [])

    return (
        <View style={styles.container}>
            <ScrollView ref={scrollViewRef} style={styles.scrollView}>
                {renderChunks(chunks)}
            </ScrollView>
            {showActions &&
                transcribedData &&
                !Array.isArray(transcribedData) &&
                !transcribedData.isBusy && (
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            onPress={exportTXT}
                            style={styles.button}
                        >
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
