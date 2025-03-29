import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { archiver, ArchiveEntry } from '@siteed/archiver';
import { Stack } from 'expo-router';

export default function ArchiverScreen() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [archive, setArchive] = useState<string | null>(null);
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [extractedFiles, setExtractedFiles] = useState<string[]>([]);

  // Load the asset when component mounts
  useEffect(() => {
    loadAsset();
  }, []);

  const loadAsset = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the asset
      const asset = Asset.fromModule(require('@assets/models/boom.tar.bz2'));
      
      // Download the asset if needed
      await asset.downloadAsync();
      
      setArchive(asset.localUri || null);
      setLoading(false);
    } catch (err) {
      setError(`Failed to load asset: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  const openArchive = async () => {
    if (!archive) {
      setError('Archive not loaded');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Open the archive
      await archiver.open(archive, 'tar.bz2');
      
      // Get all entries
      const foundEntries: ArchiveEntry[] = [];
      let entry = await archiver.getNextEntry();
      
      while (entry) {
        foundEntries.push(entry);
        entry = await archiver.getNextEntry();
      }
      
      setEntries(foundEntries);
      setLoading(false);
    } catch (err) {
      setError(`Failed to open archive: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  const extractArchive = async () => {
    if (!archive || entries.length === 0) {
      setError('Archive not opened or empty');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Create a temporary directory for extraction
      const extractDir = `${FileSystem.cacheDirectory}extracted_archive/`;
      await FileSystem.makeDirectoryAsync(extractDir, { intermediates: true });
      
      // Re-open the archive
      await archiver.open(archive, 'tar.bz2');
      
      const extractedPaths: string[] = [];
      let entry = await archiver.getNextEntry();
      
      while (entry) {
        if (!entry.isDirectory) {
          const destPath = `${extractDir}${entry.name}`;
          await archiver.extractEntry(entry, destPath);
          extractedPaths.push(destPath);
        }
        entry = await archiver.getNextEntry();
      }
      
      setExtractedFiles(extractedPaths);
      setLoading(false);
    } catch (err) {
      setError(`Failed to extract archive: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    } finally {
      // Close the archive
      try {
        await archiver.close();
      } catch (e) {
        console.error('Error closing archive:', e);
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
    fontFamily: 'monospace',
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
    fontFamily: 'monospace',
    fontSize: 12,
  },
  entryType: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  filePath: {
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 4,
  },
});
