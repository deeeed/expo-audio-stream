import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { archiver, ArchiveEntry } from '@siteed/archiver';
import { Stack } from 'expo-router';

// Helper function to clean file paths for Android compatibility
const cleanFilePath = (path: string): string => {
  if (Platform.OS === 'android') {
    // Strip the file:// or file:/ prefix if present
    if (path.startsWith('file://')) {
      console.log(`Cleaning path from file:// to: ${path.substring(7)}`);
      return path.substring(7);
    } else if (path.startsWith('file:/')) {
      console.log(`Cleaning path from file:/ to: ${path.substring(6)}`);
      return path.substring(6);
    }
  }
  return path;
};

// Log structure to track operations
interface LogEntry {
  message: string;
  timestamp: number;
  type: 'info' | 'error' | 'success';
}

export default function ArchiverScreen() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [archive, setArchive] = useState<string | null>(null);
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [extractedFiles, setExtractedFiles] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Add a log entry
  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    console.log(`[Archiver] ${type.toUpperCase()}: ${message}`);
    setLogs(prev => [...prev, { message, timestamp: Date.now(), type }]);
  };

  // Load the asset when component mounts
  useEffect(() => {
    loadAsset();
  }, []);

  const loadAsset = async () => {
    try {
      setLoading(true);
      setError(null);
      
      addLog(`Platform: ${Platform.OS}`, 'info');
      
      // Get the asset
      addLog('Loading asset from module...', 'info');
      const asset = Asset.fromModule(require('@assets/models/boom.tar.bz2'));
      
      // Download the asset if needed
      addLog('Downloading asset if needed...', 'info');
      await asset.downloadAsync();
      
      if (asset.localUri) {
        addLog(`Asset loaded at: ${asset.localUri}`, 'success');
        
        // Get supported formats
        const formats = await archiver.supportedFormats();
        addLog(`Supported formats: ${formats.join(', ')}`, 'info');
      } else {
        addLog('Asset loaded but localUri is null', 'error');
      }
      
      setArchive(asset.localUri || null);
      setLoading(false);
    } catch (err) {
      const errorMsg = `Failed to load asset: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMsg);
      addLog(errorMsg, 'error');
      setLoading(false);
    }
  };

  const openArchive = async () => {
    if (!archive) {
      const errorMsg = 'Archive not loaded';
      setError(errorMsg);
      addLog(errorMsg, 'error');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Clean the path for Android if needed
      const cleanPath = cleanFilePath(archive);
      addLog(`Opening archive at: ${cleanPath}`, 'info');
      
      // Open the archive
      await archiver.open(cleanPath, 'tar.bz2');
      addLog('Archive opened successfully', 'success');
      
      // Get all entries
      const foundEntries: ArchiveEntry[] = [];
      let entry = await archiver.getNextEntry();
      
      while (entry) {
        addLog(`Found entry: ${entry.name} (${entry.isDirectory ? 'directory' : 'file'})`, 'info');
        foundEntries.push(entry);
        entry = await archiver.getNextEntry();
      }
      
      if (foundEntries.length === 0) {
        addLog('No entries found in archive', 'info');
      } else {
        addLog(`Found ${foundEntries.length} entries in archive`, 'success');
      }
      
      setEntries(foundEntries);
      setLoading(false);
    } catch (err) {
      const errorMsg = `Failed to open archive: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMsg);
      addLog(errorMsg, 'error');
      setLoading(false);
    } finally {
      // Close the archive in case of error
      try {
        await archiver.close();
        addLog('Archive closed', 'info');
      } catch (e) {
        addLog(`Error closing archive: ${e instanceof Error ? e.message : String(e)}`, 'error');
      }
    }
  };

  const extractArchive = async () => {
    if (!archive || entries.length === 0) {
      const errorMsg = 'Archive not opened or empty';
      setError(errorMsg);
      addLog(errorMsg, 'error');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Create a temporary directory for extraction
      const extractDir = `${FileSystem.cacheDirectory}extracted_archive/`;
      await FileSystem.makeDirectoryAsync(extractDir, { intermediates: true });
      addLog(`Created extraction directory: ${extractDir}`, 'info');
      
      // Clean the extraction path for Android if needed
      const cleanExtractDir = cleanFilePath(extractDir);
      addLog(`Clean extraction path: ${cleanExtractDir}`, 'info');
      
      // Clean archive path for Android if needed
      const cleanPath = cleanFilePath(archive);
      addLog(`Re-opening archive at: ${cleanPath}`, 'info');
      
      // Re-open the archive
      await archiver.open(cleanPath, 'tar.bz2');
      addLog('Archive re-opened successfully', 'success');
      
      const extractedPaths: string[] = [];
      let entry = await archiver.getNextEntry();
      let count = 0;
      
      while (entry) {
        if (!entry.isDirectory) {
          addLog(`Extracting entry: ${entry.name}`, 'info');
          const destPath = cleanFilePath(`${extractDir}${entry.name}`);
          await archiver.extractEntry(entry, cleanExtractDir);
          addLog(`Extracted to: ${destPath}`, 'success');
          extractedPaths.push(destPath);
          count++;
        } else {
          addLog(`Skipping directory entry: ${entry.name}`, 'info');
        }
        entry = await archiver.getNextEntry();
      }
      
      if (count === 0) {
        addLog('No files extracted', 'info');
      } else {
        addLog(`Successfully extracted ${count} files`, 'success');
      }
      
      setExtractedFiles(extractedPaths);
      setLoading(false);
    } catch (err) {
      const errorMsg = `Failed to extract archive: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMsg);
      addLog(errorMsg, 'error');
      setLoading(false);
    } finally {
      // Close the archive
      try {
        await archiver.close();
        addLog('Archive closed', 'info');
      } catch (e) {
        addLog(`Error closing archive: ${e instanceof Error ? e.message : String(e)}`, 'error');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Archive Explorer' }} />
      
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Archive Explorer</Text>
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        <View style={styles.buttonContainer}>
          <Button title="Load Archive" onPress={loadAsset} disabled={loading} />
          <View style={styles.buttonSpacer} />
          <Button title="Open Archive" onPress={openArchive} disabled={!archive || loading} />
          <View style={styles.buttonSpacer} />
          <Button title="Extract Archive" onPress={extractArchive} disabled={entries.length === 0 || loading} />
        </View>
        
        {archive && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Archive:</Text>
            <Text style={styles.archivePath}>{archive}</Text>
            <Text style={styles.archivePath}>Clean path: {cleanFilePath(archive)}</Text>
          </View>
        )}
        
        {entries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entries ({entries.length}):</Text>
            {entries.map((entry, index) => (
              <View key={index} style={styles.entryItem}>
                <Text style={styles.entryName}>{entry.name}</Text>
                <Text style={styles.entryType}>{entry.isDirectory ? 'Directory' : 'File'}</Text>
              </View>
            ))}
          </View>
        )}
        
        {extractedFiles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Extracted Files:</Text>
            {extractedFiles.map((file, index) => (
              <Text key={index} style={styles.filePath}>{file}</Text>
            ))}
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operation Log:</Text>
          <ScrollView style={styles.logScrollView}>
            {logs.map((log, index) => (
              <Text 
                key={index} 
                style={[
                  styles.logEntry,
                  log.type === 'error' && styles.logError,
                  log.type === 'success' && styles.logSuccess
                ]}
              >
                {new Date(log.timestamp).toLocaleTimeString()}: {log.message}
              </Text>
            ))}
            {logs.length === 0 && (
              <Text style={styles.emptyLog}>No operation logs yet.</Text>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  buttonSpacer: {
    width: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffeeee',
    padding: 12,
    borderRadius: 6,
    marginVertical: 12,
  },
  errorText: {
    color: '#d32f2f',
  },
  section: {
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  archivePath: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  entryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  entryName: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  entryType: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  filePath: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    marginBottom: 4,
  },
  logScrollView: {
    maxHeight: 200,
  },
  logEntry: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 2,
  },
  logError: {
    color: '#d32f2f',
  },
  logSuccess: {
    color: '#388e3c',
  },
  emptyLog: {
    fontStyle: 'italic',
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
});
