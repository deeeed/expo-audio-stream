import { AppTheme, Button, useTheme, useToast } from '@siteed/design-system'
import { clearLogs, getLogs } from '@siteed/react-native-logger'
import * as Clipboard from 'expo-clipboard'
import { useFocusEffect } from 'expo-router'
import React, { useCallback, useMemo, useState } from 'react'
import {
    FlatList,
    ListRenderItemInfo,
    StyleSheet,
    Text,
    View,
} from 'react-native'

export interface LogViewerProps {}

export const LogViewer = (_: LogViewerProps) => {
    const { show } = useToast()
    const theme = useTheme()
    const styles = useMemo(() => getStyles({ theme }), [theme])
    const [logs, setLogs] = useState(getLogs())

    const handleRefresh = () => {
        setLogs(getLogs())
        show({ iconVisible: true, message: 'Logs have been updated' })
    }

    const handleClear = () => {
        clearLogs()
        handleRefresh()
    }

    const handleCopy = useCallback(async () => {
        try {
            const text = logs
                .map(
                    (log) => `${log.timestamp} ${log.namespace} ${log.message}`
                )
                .join('\n')
            await Clipboard.setStringAsync(text)
            show({ iconVisible: true, message: 'Logs copied to clipboard' })
        } catch (_err) {
            // Ignore
        }
    }, [])

    useFocusEffect(
        useCallback(() => {
            handleRefresh()
        }, [handleRefresh])
    )

    const renderItem = ({ item }: ListRenderItemInfo<(typeof logs)[0]>) => (
        <View style={styles.logEntry}>
            <View>
                <Text style={styles.timestamp}>
                    {new Date(item.timestamp).toLocaleTimeString()}
                </Text>
                <Text style={styles.context}>{item.namespace}</Text>
            </View>
            <Text style={styles.message}>{item.message}</Text>
        </View>
    )

    return (
        <View style={styles.container}>
            <FlatList
                data={logs}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${index}-${item.timestamp}`}
                style={styles.viewer}
                initialNumToRender={20} // Adjust based on performance requirements
            />
            <Button mode="outlined" onPress={handleCopy}>
                Copy
            </Button>
            <Button mode="outlined" onPress={handleRefresh}>
                Refresh
            </Button>
            <Button mode="outlined" onPress={handleClear}>
                Clear
            </Button>
        </View>
    )
}

const getStyles = ({ theme }: { theme: AppTheme }) =>
    StyleSheet.create({
        container: {
            display: 'flex',
            flex: 1,
            gap: 10,
            paddingBottom: 50,
            width: '100%',
            padding: 5,
        },
        context: {
            color: theme.colors.primary,
            fontSize: 10,
            fontWeight: 'bold',
        },
        logEntry: {},
        message: { fontSize: 10 },
        timestamp: { color: theme.colors.secondary, fontSize: 10 },
        viewer: { borderWidth: 1, flex: 1, minHeight: 100 },
    })

export default LogViewer
