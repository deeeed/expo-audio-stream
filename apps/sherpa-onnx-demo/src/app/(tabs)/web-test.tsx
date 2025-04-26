import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebTtsTest from '../../components/WebTtsTest';

export default function WebTestScreen() {
  // Only render content on web platform
  if (Platform.OS !== 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Web Tests</Text>
        <Text style={styles.message}>
          This screen is only available on web platforms.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Web-specific Tests</Text>
        <Text style={styles.description}>
          This screen contains tests for web-specific implementations using WebAssembly.
          These tests help verify that the SherpaOnnx features work correctly in the browser environment.
        </Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TTS (Text-to-Speech) Web Test</Text>
          <WebTtsTest />
        </View>
        
        {/* Additional web-specific tests can be added here */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 8,
  },
}); 