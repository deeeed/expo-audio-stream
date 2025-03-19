import React, { useCallback, useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { ScreenWrapper, useThemePreferences } from '@siteed/design-system';
import { useWasmWorker } from '../hooks/useWasmWorker';
import { useScreenHeader } from '../hooks/useScreenHeader';

export function WasmDemoScreen() {
    const { theme } = useThemePreferences();
    const [result, setResult] = useState<string>('');
    const [logs, setLogs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useScreenHeader({
        title: "WASM Demo",
        backBehavior: {
          fallbackUrl: "/more",
        },
      });

    const handleComplete = useCallback(() => {
        setIsLoading(false);
        setResult('WASM execution completed!');
    }, []);

    const handleError = useCallback((errorMessage: string) => {
        setIsLoading(false);
        setError(errorMessage);
        setResult('');
    }, []);

    const handleLog = useCallback((message: string) => {
        setLogs(prev => [...prev, message]);
    }, []);

    const { initWorker, terminateWorker } = useWasmWorker({
        onComplete: handleComplete,
        onError: handleError,
        onLog: handleLog,
    });

    const runWasm = useCallback(() => {
        setIsLoading(true);
        setError(null);
        setResult('');
        setLogs([]);
        const cleanup = initWorker();
        return () => cleanup?.();
    }, [initWorker]);

    useEffect(() => {
        return () => {
            terminateWorker();
        };
    }, [terminateWorker]);

    return (
        <ScreenWrapper>
            <ScrollView>
                <View style={{ padding: 16, gap: 16 }}>
                    
                    <View>
                        <Button 
                            mode="contained" 
                            onPress={runWasm}
                            loading={isLoading}
                            disabled={isLoading}
                        >
                            Run WASM
                        </Button>
                    </View>
                    
                    <View>
                        <Text variant="bodyLarge">{result}</Text>
                    </View>

                    {logs.length > 0 && (
                        <View style={{ 
                            backgroundColor: theme.colors.surfaceVariant,
                            padding: 16,
                            borderRadius: 8
                        }}>
                            <Text variant="titleMedium">Debug Log:</Text>
                            <ScrollView style={{ maxHeight: 300 }}>
                                {logs.map((log, index) => (
                                    <Text 
                                        key={index} 
                                        style={{ 
                                            fontFamily: 'monospace',
                                            fontSize: 12,
                                            marginVertical: 2
                                        }}
                                    >
                                        {log}
                                    </Text>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {error && (
                        <View style={{
                            backgroundColor: theme.colors.errorContainer,
                            padding: 16,
                            borderRadius: 8
                        }}>
                            <Text variant="titleMedium" style={{ color: theme.colors.error }}>
                                Error:
                            </Text>
                            <Text style={{ 
                                color: theme.colors.error,
                                fontFamily: 'monospace',
                                fontSize: 12
                            }}>
                                {error}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

export default WasmDemoScreen; 