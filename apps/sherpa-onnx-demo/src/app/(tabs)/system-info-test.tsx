import SherpaOnnx from '@siteed/sherpa-onnx.rn';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SystemInfo } from '@siteed/sherpa-onnx.rn/src/types/interfaces';

/**
 * System Info Test Tab
 * 
 * This component provides comprehensive testing of the new system info methods:
 * - getSystemInfo()
 * - getArchitectureInfo()
 * 
 * This is a practical alternative to complex Xcode test targets that get
 * wiped out by EAS builds. This tab gives immediate visual feedback.
 */
const SystemInfoTest: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [archInfo, setArchInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Array<{test: string, result: 'PASS' | 'FAIL', details: string}>>([]);
  const [performanceData, setPerformanceData] = useState<Array<{call: string, duration: number}>>([]);

  useEffect(() => {
    // Auto-run tests on component mount
    runAllTests();
  }, []);

  const runAllTests = async () => {
    console.log('🧪 Starting comprehensive system info tests...');
    const results: Array<{test: string, result: 'PASS' | 'FAIL', details: string}> = [];
    const performance: Array<{call: string, duration: number}> = [];
    
    setLoading(true);
    setError(null);
    setTestResults([]);
    setPerformanceData([]);
    
    try {
      // Test 1: getSystemInfo() functionality
      console.log('📊 Testing getSystemInfo()...');
      const startTime1 = Date.now();
      const sysInfo = await SherpaOnnx.getSystemInfo();
      const duration1 = Date.now() - startTime1;
      
      performance.push({ call: 'getSystemInfo()', duration: duration1 });
      
      if (sysInfo && typeof sysInfo === 'object') {
        setSystemInfo(sysInfo);
        results.push({ 
          test: 'getSystemInfo() call', 
          result: 'PASS', 
          details: `Returned valid object in ${duration1}ms` 
        });
        console.log('✅ getSystemInfo() - PASS');
      } else {
        results.push({ 
          test: 'getSystemInfo() call', 
          result: 'FAIL', 
          details: 'Did not return valid object' 
        });
        console.log('❌ getSystemInfo() - FAIL');
      }
      
      // Test 2: getArchitectureInfo() functionality  
      console.log('🏗️ Testing getArchitectureInfo()...');
      const startTime2 = Date.now();
      const archResult = await SherpaOnnx.getArchitectureInfo();
      const duration2 = Date.now() - startTime2;
      
      performance.push({ call: 'getArchitectureInfo()', duration: duration2 });
      
      if (archResult && typeof archResult === 'object') {
        setArchInfo(archResult);
        results.push({ 
          test: 'getArchitectureInfo() call', 
          result: 'PASS', 
          details: `Returned valid object in ${duration2}ms` 
        });
        console.log('✅ getArchitectureInfo() - PASS');
      } else {
        results.push({ 
          test: 'getArchitectureInfo() call', 
          result: 'FAIL', 
          details: 'Did not return valid object' 
        });
        console.log('❌ getArchitectureInfo() - FAIL');
      }
      
      // Test 3: Data structure validation
      if (sysInfo) {
        console.log('🔍 Validating data structure...');
        
        // Test architecture field
        if (sysInfo.architecture && sysInfo.architecture.type) {
          const archType = sysInfo.architecture.type;
          if (archType === 'old' || archType === 'new') {
            results.push({ 
              test: 'Architecture detection', 
              result: 'PASS', 
              details: `Detected: ${archType.toUpperCase()}` 
            });
          } else {
            results.push({ 
              test: 'Architecture detection', 
              result: 'FAIL', 
              details: `Invalid type: ${archType}` 
            });
          }
        } else {
          results.push({ 
            test: 'Architecture detection', 
            result: 'FAIL', 
            details: 'Architecture field missing' 
          });
        }
        
        // Test memory field
        if (sysInfo.memory && typeof sysInfo.memory.totalMemoryMB === 'number') {
          results.push({ 
            test: 'Memory information', 
            result: 'PASS', 
            details: `Total: ${sysInfo.memory.totalMemoryMB.toFixed(1)}MB` 
          });
        } else {
          results.push({ 
            test: 'Memory information', 
            result: 'FAIL', 
            details: 'Memory field missing or invalid' 
          });
        }
        
        // Test CPU field
        if (sysInfo.cpu && typeof sysInfo.cpu.availableProcessors === 'number') {
          results.push({ 
            test: 'CPU information', 
            result: 'PASS', 
            details: `Cores: ${sysInfo.cpu.availableProcessors}` 
          });
        } else {
          results.push({ 
            test: 'CPU information', 
            result: 'FAIL', 
            details: 'CPU field missing or invalid' 
          });
        }
        
        // Test device field
        if (sysInfo.device && sysInfo.device.brand) {
          results.push({ 
            test: 'Device information', 
            result: 'PASS', 
            details: `${sysInfo.device.brand} ${sysInfo.device.model || ''}` 
          });
        } else {
          results.push({ 
            test: 'Device information', 
            result: 'FAIL', 
            details: 'Device field missing or invalid' 
          });
        }
      }
      
      // Test 4: Performance requirements
      console.log('⏱️ Testing performance requirements...');
      const avgDuration = performance.reduce((sum, p) => sum + p.duration, 0) / performance.length;
      
      if (avgDuration < 100) {
        results.push({ 
          test: 'Performance (<100ms avg)', 
          result: 'PASS', 
          details: `Average: ${avgDuration.toFixed(1)}ms` 
        });
      } else {
        results.push({ 
          test: 'Performance (<100ms avg)', 
          result: 'FAIL', 
          details: `Too slow: ${avgDuration.toFixed(1)}ms` 
        });
      }
      
    } catch (testError) {
      const errorMsg = testError instanceof Error ? testError.message : 'Unknown error';
      setError(errorMsg);
      results.push({ 
        test: 'Error handling', 
        result: 'FAIL', 
        details: errorMsg 
      });
      console.log('❌ Test error:', errorMsg);
    }
    
    setTestResults(results);
    setPerformanceData(performance);
    setLoading(false);
    
    // Log summary
    const passCount = results.filter(r => r.result === 'PASS').length;
    const totalCount = results.length;
    console.log(`📊 Test Summary: ${passCount}/${totalCount} tests passed`);
  };

  const renderTestResult = (test: {test: string, result: 'PASS' | 'FAIL', details: string}, index: number) => (
    <View key={index} style={[styles.testRow, test.result === 'PASS' ? styles.testPass : styles.testFail]}>
      <View style={styles.testHeader}>
        <Text style={styles.testName}>{test.test}</Text>
        <Text style={[styles.testResult, test.result === 'PASS' ? styles.passText : styles.failText]}>
          {test.result === 'PASS' ? '✅' : '❌'} {test.result}
        </Text>
      </View>
      <Text style={styles.testDetails}>{test.details}</Text>
    </View>
  );

  const renderSystemInfoData = () => {
    if (!systemInfo) return null;

    return (
      <View style={styles.dataSection}>
        <Text style={styles.sectionTitle}>📊 System Information Data</Text>
        
        <View style={styles.dataGroup}>
          <Text style={styles.dataLabel}>Architecture:</Text>
          <Text style={styles.dataValue}>
            {systemInfo.architecture?.type?.toUpperCase()} - {systemInfo.architecture?.description}
          </Text>
        </View>
        
        <View style={styles.dataGroup}>
          <Text style={styles.dataLabel}>Platform:</Text>
          <Text style={styles.dataValue}>
            {Platform.OS} {systemInfo.device?.iosVersion || systemInfo.device?.androidVersion || ''}
          </Text>
        </View>
        
        <View style={styles.dataGroup}>
          <Text style={styles.dataLabel}>Device:</Text>
          <Text style={styles.dataValue}>
            {systemInfo.device?.brand} {systemInfo.device?.model}
          </Text>
        </View>
        
        <View style={styles.dataGroup}>
          <Text style={styles.dataLabel}>Memory:</Text>
          <Text style={styles.dataValue}>
            {systemInfo.memory?.usedMemoryMB?.toFixed(1)}MB / {systemInfo.memory?.totalMemoryMB?.toFixed(1)}MB
          </Text>
        </View>
        
        <View style={styles.dataGroup}>
          <Text style={styles.dataLabel}>CPU Cores:</Text>
          <Text style={styles.dataValue}>{systemInfo.cpu?.availableProcessors}</Text>
        </View>
        
        <View style={styles.dataGroup}>
          <Text style={styles.dataLabel}>Library Status:</Text>
          <Text style={[styles.dataValue, systemInfo.libraryLoaded ? styles.positive : styles.negative]}>
            {systemInfo.libraryLoaded ? 'Loaded' : 'Not Loaded'}
          </Text>
        </View>
      </View>
    );
  };

  const passCount = testResults.filter(r => r.result === 'PASS').length;
  const totalCount = testResults.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>System Info Tests</Text>
        <Text style={styles.subtitle}>Real-time testing of sherpa-onnx system methods</Text>
        
        <TouchableOpacity 
          style={[styles.testButton, loading && styles.testButtonDisabled]}
          onPress={runAllTests}
          disabled={loading}
        >
          <Text style={styles.testButtonText}>
            {loading ? 'Running Tests...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ Error: {error}</Text>
          </View>
        )}

        {testResults.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>
              📋 Test Results ({passCount}/{totalCount} passed)
            </Text>
            {testResults.map(renderTestResult)}
          </View>
        )}

        {performanceData.length > 0 && (
          <View style={styles.performanceSection}>
            <Text style={styles.sectionTitle}>⏱️ Performance Data</Text>
            {performanceData.map((perf, index) => (
              <View key={index} style={styles.perfRow}>
                <Text style={styles.perfCall}>{perf.call}</Text>
                <Text style={[styles.perfDuration, perf.duration < 100 ? styles.positive : styles.negative]}>
                  {perf.duration}ms
                </Text>
              </View>
            ))}
          </View>
        )}

        {renderSystemInfoData()}
        
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>🎯 What This Tests</Text>
          <Text style={styles.infoText}>
            • getSystemInfo() method functionality{'\n'}
            • getArchitectureInfo() method functionality{'\n'}
            • React Native architecture detection (Old vs New){'\n'}
            • Performance requirements (&lt;100ms){'\n'}
            • Data structure validation{'\n'}
            • Cross-platform compatibility
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  testButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#FFE6E6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF9999',
  },
  errorText: {
    color: '#CC0000',
    fontSize: 14,
  },
  resultsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  testRow: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  testPass: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  testFail: {
    backgroundColor: '#FFE8E8',
    borderColor: '#F44336',
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  testResult: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  passText: {
    color: '#4CAF50',
  },
  failText: {
    color: '#F44336',
  },
  testDetails: {
    fontSize: 14,
    color: '#666',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  performanceSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  perfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  perfCall: {
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  perfDuration: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#F44336',
  },
  dataSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dataGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  dataValue: {
    fontSize: 14,
    color: '#333',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    flex: 1,
    textAlign: 'right',
  },
  infoSection: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976D2',
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
});

export default SystemInfoTest;