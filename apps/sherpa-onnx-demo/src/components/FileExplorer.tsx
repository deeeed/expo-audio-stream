import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { formatBytes } from '../utils/formatters';
import { useModelManagement } from '../contexts/ModelManagement/ModelManagementContext';
import { ModelState } from '../contexts/ModelManagement/types';

interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
  size?: number;
  uri?: string;
  modelId?: string;
  description?: string;
  displayPath?: string;
  modelType?: string;
}

interface FileExplorerProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  filterType: string;
  initialModelPath: string | null;
  onBackToDownloads?: () => void;
}

export function FileExplorer({
  currentPath,
  onNavigate,
  filterType,
  initialModelPath,
  onBackToDownloads
}: FileExplorerProps) {
  const { getDownloadedModels } = useModelManagement();
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealPath, setIsRealPath] = useState(false);

  useEffect(() => {
    // Check if we're looking at a real file system path or the virtual root
    const isActualFilePath = currentPath && (
      currentPath.startsWith(FileSystem.documentDirectory || '') || 
      currentPath.startsWith('file://')
    );
    
    setIsRealPath(!!isActualFilePath);
    fetchItems();
  }, [currentPath, filterType, initialModelPath]);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      // If we have a real file system path (from a model)
      if (currentPath && (
        currentPath.startsWith(FileSystem.documentDirectory || '') || 
        currentPath.startsWith('file://')
      )) {
        // This is a real path, fetch actual files
        console.log(`Fetching files from: ${currentPath}`);
        
        // Ensure the path exists
        const pathInfo = await FileSystem.getInfoAsync(currentPath);
        if (!pathInfo.exists) {
          setError(`Path does not exist: ${currentPath}`);
          setItems([]);
          setLoading(false);
          return;
        }
        
        // Read directory contents
        const fileList = await FileSystem.readDirectoryAsync(currentPath);
        console.log(`Found ${fileList.length} items`);
        
        // Get info for each item
        const itemsWithInfo = await Promise.all(
          fileList.map(async (name) => {
            const itemPath = `${currentPath}/${name}`;
            try {
              const info = await FileSystem.getInfoAsync(itemPath);
              return {
                name,
                path: itemPath,
                displayPath: itemPath,
                isDirectory: info.isDirectory || false,
                size: 'size' in info ? info.size : undefined,
                uri: info.uri
              };
            } catch (itemError) {
              console.error(`Error getting info for ${name}:`, itemError);
              return {
                name,
                path: itemPath,
                displayPath: itemPath,
                isDirectory: false,
                error: String(itemError)
              };
            }
          })
        );
        
        setItems(itemsWithInfo);
      } else {
        // This is the root of the browse models view - display downloaded models
        if (currentPath === '') {
          const downloadedModels = getDownloadedModels();
          
          // Filter models based on type if needed
          const filteredModels = filterType === 'all' 
            ? downloadedModels 
            : downloadedModels.filter(model => model.metadata.type === filterType);
          
          if (filteredModels.length === 0) {
            setError('No downloaded models found. Please download models first.');
            setItems([]);
          } else {
            // Convert downloaded models to FileItems
            const modelItems: FileItem[] = filteredModels.map(model => {
              // Format the path to make it more readable
              const displayPath = model.localPath ? 
                model.localPath.replace('file://', '') : 'Path not available';
              
              return {
                name: model.metadata.name,
                isDirectory: true,
                path: model.localPath || '',
                displayPath,
                modelId: model.metadata.id,
                description: model.metadata.description,
                modelType: model.metadata.type
              };
            });
            
            setItems(modelItems);
          }
        } else {
          // This shouldn't typically happen as we're either at root or showing real paths
          setError('Invalid path');
          setItems([]);
        }
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setError(`Error fetching files: ${error instanceof Error ? error.message : String(error)}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateUp = () => {
    if (isRealPath) {
      // For real file paths, go up one directory
      const pathParts = currentPath.split('/');
      // Remove the last part
      pathParts.pop();
      const newPath = pathParts.join('/');
      
      // If we're at the root of a model and going up, return to downloads view
      if (initialModelPath && (newPath === initialModelPath.split('/').slice(0, -1).join('/') || newPath === initialModelPath)) {
        onNavigate('');
        return;
      }
      
      onNavigate(newPath);
    } else {
      // For virtual paths, likely just going back to downloads view
      if (onBackToDownloads) {
        onBackToDownloads();
      }
    }
  };

  const handleItemPress = (item: FileItem) => {
    if (item.isDirectory) {
      onNavigate(item.path);
    } else {
      console.log('Selected file:', item.path);
      // You can implement file viewing or other actions here
    }
  };

  const renderModelItem = (item: FileItem) => {
    // Special rendering for root level models
    if (!isRealPath && item.modelId) {
      return (
        <View style={styles.itemContent}>
          <View style={styles.itemMainContent}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.itemDescription} numberOfLines={1} ellipsizeMode="tail">
                {item.description}
              </Text>
            )}
            {item.displayPath && (
              <Text style={styles.itemPath} numberOfLines={1} ellipsizeMode="middle">
                {item.displayPath}
              </Text>
            )}
            {item.modelType && (
              <Text style={styles.itemType}>
                Type: {item.modelType}
              </Text>
            )}
          </View>
          <View style={styles.itemDetails}>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </View>
      );
    }
    
    // Standard file item rendering
    return (
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={styles.itemDetails}>
          {item.size !== undefined && (
            <Text style={styles.itemSize}>{formatBytes(item.size)}</Text>
          )}
          {item.isDirectory && (
            <Ionicons name="chevron-forward" size={20} color="#999" />
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Path navigation header */}
      <View style={styles.pathHeader}>
        {(currentPath !== '' || !onBackToDownloads) && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={navigateUp}
          >
            <Ionicons name="arrow-back" size={20} color="#2196F3" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.pathText} numberOfLines={1} ellipsizeMode="middle">
          {isRealPath 
            ? currentPath 
            : (currentPath === '' ? 'Downloaded Models' : currentPath)}
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          {error.includes('No downloaded models') && (
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={onBackToDownloads}
            >
              <Text style={styles.downloadButtonText}>Go to Download Models</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* File/folder list */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.path}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => handleItemPress(item)}
          >
            <View style={styles.itemIconContainer}>
              <Ionicons 
                name={item.isDirectory ? 'folder' : 'document-text'} 
                size={24} 
                color={item.isDirectory ? '#FFD700' : '#2196F3'} 
              />
            </View>
            {renderModelItem(item)}
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          error ? null : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No files found in this location</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  backText: {
    color: '#2196F3',
    marginLeft: 4,
    fontWeight: '500',
  },
  pathText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#fff0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ffcccc',
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  downloadButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  downloadButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  itemIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  itemMainContent: {
    flex: 1,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  itemPath: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  itemType: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemSize: {
    fontSize: 12,
    color: '#888',
    marginRight: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 52,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
}); 