import { useTheme } from '@siteed/design-system'
import { getLogger } from '@siteed/react-native-logger'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SegmentedButtons } from 'react-native-paper'
import { convertPCMToFloat32 } from '@siteed/expo-audio-stream/src'

interface HexDataViewerProps {
    byteArray: Uint8Array
    bitDepth: number
}

type ViewMode = 'hex' | 'base64' | 'string' | 'float32'

const PREVIEW_LENGTH = 300

const logger = getLogger('HexDataViewer')

const bytesToHex = (bytes: Uint8Array) => {
    return bytes.reduce(
        (str, byte) => str + byte.toString(16).padStart(2, '0') + ' ',
        ''
    )
}

const bytesToBase64 = (bytes: Uint8Array) => {
    const binary = String.fromCharCode(...bytes)
    return btoa(binary)
}

const bytesToString = (bytes: Uint8Array) => {
    return String.fromCharCode(...bytes)
}

export const HexDataViewer = ({ byteArray, bitDepth }: HexDataViewerProps) => {
    const [viewMode, setViewMode] = useState<ViewMode>('hex')
    const [expanded, setExpanded] = useState(false)
    const [float32Data, setFloat32Data] = useState<string>('')

    const theme = useTheme()

    const handleValueChange = (value: string) => {
        setViewMode(value as ViewMode)
    }


    const convertToFloat32 = useCallback(async () => {
        if (viewMode === 'float32') {
            try {
                logger.debug(`Starting PCM to Float32 conversion for buffer with byteLength: ${byteArray.byteLength}`);
                const pcmConversionResult = await convertPCMToFloat32({
                    buffer: byteArray.buffer,
                    bitDepth,
                    skipWavHeader: false,
                })
                const float32String = pcmConversionResult.pcmValues.join(' ')
                setFloat32Data(float32String)
            } catch (error) {
                logger.error('Failed to convert to float32', error)
            }
        }
    }, [byteArray, bitDepth, viewMode])


    const displayedData = useMemo(() => {
        switch (viewMode) {
            case 'hex':
                return bytesToHex(byteArray);
            case 'base64':
                return bytesToBase64(byteArray);
            case 'string':
                return bytesToString(byteArray);
            case 'float32':
                return float32Data;
            default:
                return '';
        }
    }, [viewMode, byteArray, float32Data]);

    const previewData = displayedData.slice(0, PREVIEW_LENGTH)
    const isExpandable = displayedData.length > PREVIEW_LENGTH

    useEffect(() => {
        convertToFloat32()
    }, [convertToFloat32])

    return (
        <View style={styles.container}>
            <SegmentedButtons
                value={viewMode}
                onValueChange={handleValueChange}
                buttons={[
                    {
                        value: 'hex',
                        label: 'Hex',
                    },
                    { value: 'float32', label: 'PCM' },
                    {
                        value: 'base64',
                        label: 'Base64',
                    },
                    {
                        value: 'string',
                        label: 'String',
                    }
                ]}
                style={styles.segmentedButton}
            />
            <Text style={[styles.data, { color: theme.colors.text }]}>
                {expanded ? displayedData : previewData}
                {isExpandable && !expanded && (
                    <Pressable onPress={() => setExpanded(true)}>
                        <Text
                            style={[
                                styles.expandText,
                                { color: theme.colors.primary },
                            ]}
                        >
                            {' '}
                            Expand
                        </Text>
                    </Pressable>
                )}
            </Text>
            {expanded && (
                <Pressable onPress={() => setExpanded(false)}>
                    <Text
                        style={[
                            styles.expandText,
                            { color: theme.colors.primary },
                        ]}
                    >
                        {' '}
                        Show Less
                    </Text>
                </Pressable>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        marginTop: 10,
    },
    segmentedButton: {
        marginBottom: 10,
    },
    data: {
        marginTop: 10,
        fontSize: 14,
    },
    expandText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
})
