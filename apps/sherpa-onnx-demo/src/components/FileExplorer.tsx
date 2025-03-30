import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Alert
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
  error?: string;
  exists?: boolean;
}

interface FileExplorerProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  filterType: string;
  initialModelPath: string | null;
  onBackToDownloads?: () => void;
}

// Normalize paths (remove trailing slash) - Keep it simple
function normalizePath(path: string | null | undefined): string {
  if (!path) return '';
  return path.replace(/\/$/, '');
}

// Get normalized document directory once (remove trailing slash)
const normalizedDocumentDirectory = normalizePath(FileSystem.documentDirectory);

export function FileExplorer({
  currentPath: rawCurrentPath,
  onNavigate,
  filterType,
  initialModelPath,
  onBackToDownloads
}: FileExplorerProps) {
  const { getDownloadedModels } = useModelManagement();
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize normalized paths derived from props to stabilize dependencies
  const currentPath = useMemo(() => normalizePath(rawCurrentPath), [rawCurrentPath]);
  const modelRootPath = useMemo(() => normalizePath(initialModelPath), [initialModelPath]);

  // Effect to handle initial path setting when initialModelPath changes
  useEffect(() => {
    // This effect should only trigger navigation if the *initial* path changes
    // and the *current* path doesn't match the new initial target.
    const targetPath = initialModelPath ? modelRootPath : ''; // Target is root or virtual root
    console.log(`FileExplorer Init Effect: Target=${targetPath}, Current=${currentPath}`);
    if (currentPath !== targetPath) {
      console.log(`FileExplorer Init Effect: Navigating to target path: ${targetPath}`);
      onNavigate(targetPath); // Navigate to the correct initial state
    }
    // Depend only on the derived target paths and the navigation function
  }, [initialModelPath, modelRootPath, onNavigate]); // Removed currentPath dependency

  const fetchItems = useCallback(async (logOnly = false) => {
    // Use the memoized normalized currentPath directly for fetching logic
    const pathForFetch = currentPath;
    const prefix = logOnly ? 'DEBUG' : 'UI';

    // Safety check (though currentPath should be stable now)
    if (pathForFetch === null || pathForFetch === undefined) { // Check the derived path
      console.log(`fetchItems (${prefix}): Skipping fetch, derived currentPath is null/undefined.`);
      if (!logOnly) setLoading(false);
      return;
    }

    console.log(`fetchItems (${prefix}): Starting fetch.`);
    console.log(`  > currentPath (normalized): "${pathForFetch}"`);
    // Log raw prop for comparison if needed
    // console.log(`  > rawCurrentPath prop: "${rawCurrentPath}"`);

    if (!logOnly) {
      setLoading(true);
      setError(null);
      setItems([]); // Clear items immediately for UI fetch
    }

    try {
      // --- Explicit Path Type Check ---
      let pathType: 'virtual' | 'real' | 'invalid' = 'invalid';

      // Check 1: Is it the virtual root?
      if (pathForFetch === '') {
        pathType = 'virtual';
      }
      // Check 2: Does it look like a real path?
      // Use || because one source might provide file://, the other might not.
      else if (pathForFetch.startsWith(normalizedDocumentDirectory) || pathForFetch.startsWith('file://')) {
        pathType = 'real';
      }
      // Else: It's not virtual root and doesn't look like a known real path format

      // **CRITICAL LOGGING FOR UI PATH**
      if (!logOnly) {
          console.log(`fetchItems (UI): Path Type Determination for "${pathForFetch}":`);
          console.log(`  > normalizedDocumentDirectory: ${normalizedDocumentDirectory}`);
          console.log(`  > pathForFetch.startsWith(normalizedDocumentDirectory): ${pathForFetch.startsWith(normalizedDocumentDirectory)}`);
          console.log(`  > pathForFetch.startsWith('file://'): ${pathForFetch.startsWith('file://')}`);
          console.log(`  > Determined Path Type: ${pathType}`);
      }
      // --- End Explicit Path Type Check ---


      // Case 1: Real file system path
      if (pathType === 'real') {
        console.log(`fetchItems (${prefix}): Handling as REAL path: ${pathForFetch}`);

        // --- Filesystem operations ---
        let pathInfo: FileSystem.FileInfo | null = null;
         try {
           // console.log(`fetchItems (${prefix}): Attempting getInfoAsync for: ${pathForFetch}`); // Less verbose
           pathInfo = await FileSystem.getInfoAsync(pathForFetch, { size: true });
           // console.log(`fetchItems (${prefix}): getInfoAsync result:`, JSON.stringify(pathInfo)); // Less verbose

           if (!pathInfo.exists) throw new Error(`Path does not exist.`);
           if (!pathInfo.isDirectory) throw new Error(`Path is a file, not a directory.`);

         } catch (e) {
           const infoError = e instanceof Error ? e : new Error(String(e));
           const errorMsg = `getInfoAsync failed for ${pathForFetch}: ${infoError.message}`;
           console.error(`fetchItems (${prefix}): ${errorMsg}`, infoError);
           if (!logOnly) setError(errorMsg);
           setItems([]);
           return; // Stop processing
         }

         let fileList: string[] = [];
         try {
          //  console.log(`fetchItems (${prefix}): Attempting readDirectoryAsync for: ${pathForFetch}`); // Less verbose
           fileList = await FileSystem.readDirectoryAsync(pathForFetch);
          //  console.log(`fetchItems (${prefix}): readDirectoryAsync succeeded, found ${fileList.length} items.`); // Less verbose
         } catch (e) {
           const readDirError = e instanceof Error ? e : new Error(String(e));
           const errorMsg = `readDirectoryAsync failed for ${pathForFetch}: ${readDirError.message}`;
           console.error(`fetchItems (${prefix}): ${errorMsg}`, readDirError);
           if (!logOnly) setError(errorMsg);
           setItems([]);
           return; // Stop processing
         }

         const itemsWithInfoPromises = fileList.map(async (name) => {
           const itemPath = `${pathForFetch}/${name}`;
           try {
             const info = await FileSystem.getInfoAsync(itemPath, { size: true });
             if (!info.exists) {
                 console.warn(`fetchItems (${prefix}): Item ${name} reported but doesn't exist at ${itemPath}`);
                 return { name, path: itemPath, displayPath: itemPath.replace(/^file:\/\//, ''), isDirectory: false, exists: false, error: 'Reported but doesn\'t exist' };
             }
             return {
               name, path: itemPath, displayPath: itemPath.replace(/^file:\/\//, ''),
               isDirectory: info.isDirectory ?? false,
               size: info.isDirectory ? undefined : info.size,
               uri: info.uri, exists: info.exists,
             };
           } catch (itemError) {
             console.error(`fetchItems (${prefix}): Error getting info for ${itemPath}:`, itemError);
             return { name, path: itemPath, displayPath: itemPath.replace(/^file:\/\//, ''), isDirectory: false, exists: false, error: `Failed to get info: ${String(itemError)}` };
           }
         });

         const itemsWithInfo = await Promise.all(itemsWithInfoPromises);
         const validItems = itemsWithInfo.filter(item => item.exists);

         if (!logOnly) {
           setItems(validItems as FileItem[]);
           console.log(`fetchItems (${prefix}): Set ${validItems.length} valid items for UI.`);
         } else {
           console.log(`fetchItems (${prefix}): Debug - Found ${validItems.length} valid items.`);
           // Log debug items if needed
           // validItems.forEach(item => console.log(JSON.stringify(item)));
         }
         // --- End Filesystem operations ---
      }
      // Case 2: Virtual root
      else if (pathType === 'virtual') {
        console.log(`fetchItems (${prefix}): Handling as VIRTUAL root.`);
        const downloadedModels = getDownloadedModels();
        const filteredModels = filterType === 'all'
           ? downloadedModels
           : downloadedModels.filter(model => model.metadata.type === filterType);

        if (filteredModels.length === 0) {
           const msg = 'No downloaded models found matching the filter.';
           console.log(`fetchItems (${prefix}): ${msg}`);
           if (!logOnly) setError(msg);
           setItems([]);
         } else {
           const modelItems: FileItem[] = filteredModels
             .filter(model => model.localPath)
             .map(model => ({
               name: model.metadata.name, isDirectory: true,
               path: normalizePath(model.localPath!), // Use normalized path
               displayPath: model.localPath!.replace(/^file:\/\//, ''),
               modelId: model.metadata.id, description: model.metadata.description,
               modelType: model.metadata.type, size: undefined, exists: true,
             }));
           if (!logOnly) {
               setItems(modelItems);
               console.log(`fetchItems (${prefix}): Set ${modelItems.length} model items for UI.`);
           } else {
               console.log(`fetchItems (${prefix}): Debug - Found ${modelItems.length} model items.`);
           }
         }
      }
      // Case 3: Invalid/Unhandled path
      else { // pathType === 'invalid'
         const errorMsg = `Invalid or unhandled path state: "${pathForFetch}"`;
         console.error(`fetchItems (${prefix}): ${errorMsg}`);
         if (!logOnly) setError(errorMsg);
         setItems([]);
      }
    } catch (error) {
      const errorMsg = `Error in fetchItems for ${pathForFetch}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`fetchItems (${prefix}): Caught top-level error - ${errorMsg}`, error);
      if (!logOnly) setError(errorMsg);
      setItems([]);
    } finally {
      if (!logOnly) {
          setLoading(false);
      }
      console.log(`fetchItems (${prefix}): Fetch finished for path: "${pathForFetch}"`);
    }
  }, [currentPath, filterType, getDownloadedModels]); // Depend on memoized path, filter, getter

  // Effect to trigger fetch when currentPath or filterType changes
  useEffect(() => {
    console.log("Fetch Effect: Triggered. currentPath=", currentPath);
    // No need to check for null/undefined here if currentPath is derived via useMemo from prop
    fetchItems();
  }, [fetchItems]); // Depend only on the memoized callback

  const logDirectoryContents = () => {
    fetchItems(true);
  };

  const navigateUp = () => {
    // Determine path type using the same logic as fetchItems
    let isActualFilePath = false;
    if (currentPath.startsWith(normalizedDocumentDirectory) || currentPath.startsWith('file://')) {
        isActualFilePath = true;
    }

    console.log(`Navigate Up: Current path: "${currentPath}", Model root: "${modelRootPath}", isActualFilePath: ${isActualFilePath}`);

    if (!isActualFilePath) { // At virtual root
      console.log("Navigate Up: At virtual root. Calling onBackToDownloads.");
      onBackToDownloads?.();
      return;
    }

    if (currentPath === modelRootPath) { // Exactly at the root of the selected model
      console.log(`Navigate Up: At model root (${currentPath}). Calling onBackToDownloads.`);
      onBackToDownloads?.(); // Go back to the virtual list
      return;
    }

    // --- Parent Path Calculation (Keep as is) ---
    const pathParts = currentPath.split('/');
    if (pathParts.length <= (currentPath.startsWith('file://') ? 3 : 1)) {
       console.log("Navigate Up: Cannot go further up from filesystem root.", pathParts);
       onBackToDownloads?.();
       return;
    }
    pathParts.pop();
    let parentPath = pathParts.join('/');
    // Handle edge cases like "file:///" or "/"
    if (parentPath === 'file:/') parentPath = 'file:///';
    else if (!parentPath && currentPath.startsWith('/')) parentPath = '/';

    // Safety check against navigating above model root
     if (modelRootPath && !parentPath.startsWith(modelRootPath) && parentPath !== modelRootPath) {
       console.warn(`Navigate Up: Calculated parent "${parentPath}" is outside model root "${modelRootPath}". Returning to downloads.`);
       onBackToDownloads?.();
       return;
     }
    // --- End Parent Path Calculation ---

    console.log(`Navigate Up: Navigating from ${currentPath} to parent: ${parentPath}`);
    onNavigate(parentPath);
  };

  const handleItemPress = (item: FileItem) => {
    if (item.isDirectory) {
      console.log(`Navigating to folder: ${item.path}`);
      onNavigate(item.path); // Navigate using the path from the item
    } else {
      console.log('Selected file:', item.path);
      Alert.alert("File Selected", `You tapped on the file: ${item.name}`);
    }
  };

  // --- UI Rendering Logic ---

  const isVirtualRootDisplay = currentPath === '';
  const isBackButtonDisabled = isVirtualRootDisplay && !onBackToDownloads;
  const isShowingRealPathHeader = !isVirtualRootDisplay;

  const renderModelItem = (item: FileItem) => {
    if (isVirtualRootDisplay && item.modelId) {
       return ( // Model Card at Virtual Root
        <View style={styles.itemContent}>
          <View style={styles.itemMainContent}>
            <Text style={styles.itemName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
            {item.description && <Text style={styles.itemDescription} numberOfLines={1} ellipsizeMode="tail">{item.description}</Text>}
            {item.displayPath && <Text style={styles.itemPath} numberOfLines={1} ellipsizeMode="middle">Path: {item.displayPath}</Text>}
            {item.modelType && <Text style={styles.itemType}>Type: {item.modelType}</Text>}
          </View>
          <View style={styles.itemDetails}><Ionicons name="chevron-forward" size={20} color="#999" /></View>
        </View>
      );
    }
    return ( // Regular File/Folder Item
      <View style={styles.itemContent}>
         <View style={styles.itemMainContent}>
            <Text style={styles.itemName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
            {item.error && <Text style={styles.itemErrorText}>{item.error}</Text>}
         </View>
        <View style={styles.itemDetails}>
          {item.size !== undefined && !item.isDirectory && <Text style={styles.itemSize}>{formatBytes(item.size)}</Text>}
          {item.isDirectory && <Ionicons name="chevron-forward" size={20} color="#999" />}
        </View>
      </View>
    );
  };

  // Loading state display
  if (loading && items.length === 0 && !error) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text>Loading: {currentPath.replace(/^file:\/\//, '')}</Text>
      </View>
    );
  }

  // Main component render
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={navigateUp} disabled={isBackButtonDisabled}>
          <Ionicons name="arrow-back" size={24} color={isBackButtonDisabled ? "#ccc" : "#2196F3"} />
        </TouchableOpacity>
        <Text style={styles.currentPathText} numberOfLines={1} ellipsizeMode="middle">
          {isShowingRealPathHeader ? currentPath.replace(/^file:\/\//, '') : 'Downloaded Models'}
        </Text>
        {isShowingRealPathHeader && (
           <TouchableOpacity style={styles.debugButton} onPress={logDirectoryContents}>
             <Ionicons name="bug" size={24} color="#ff9800" />
           </TouchableOpacity>
        )}
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          {error.includes('No downloaded models') && onBackToDownloads && (
            <TouchableOpacity style={styles.downloadButton} onPress={onBackToDownloads}>
              <Text style={styles.downloadButtonText}>Go to Download Models</Text>
            </TouchableOpacity>
          )}
          {!error.includes('No downloaded models') && (
             <TouchableOpacity style={styles.retryButton} onPress={() => fetchItems()} >
               <Text style={styles.retryButtonText}>Retry</Text>
             </TouchableOpacity>
           )}
        </View>
      )}

      {/* File List */}
      <FlatList
        // Optimization: Add extraData prop if list doesn't update visually sometimes
        // extraData={items}
        data={items}
        keyExtractor={(item) => item.path}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => handleItemPress(item)}
            disabled={!!item.error && !item.isDirectory}
          >
            <View style={styles.itemIconContainer}>
              <Ionicons
                name={item.isDirectory ? 'folder-outline' : 'document-text-outline'}
                size={24}
                color={item.isDirectory ? (item.error ? '#ffcc80' : '#FFC107') : (item.error ? '#ef9a9a' : '#2196F3')}
              />
            </View>
            {renderModelItem(item)}
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {isVirtualRootDisplay ? 'No downloaded models found' : 'Folder is empty'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', backgroundColor: '#f8f8f8' },
  backButton: { padding: 8, marginRight: 8 },
  currentPathText: { flex: 1, fontSize: 14, color: '#666', marginHorizontal: 8 },
  debugButton: { padding: 8, marginLeft: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorContainer: { padding: 16, backgroundColor: '#fff0f0', borderBottomWidth: 1, borderBottomColor: '#ffcccc', alignItems: 'center' },
  errorText: { color: '#d32f2f', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  retryButton: { backgroundColor: '#FF9800', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, marginTop: 8 },
  retryButtonText: { color: '#fff', fontWeight: '500' },
  downloadButton: { backgroundColor: '#2196F3', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, marginTop: 8 },
  downloadButtonText: { color: '#fff', fontWeight: '500' },
  itemContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  itemIconContainer: { width: 40, alignItems: 'center', marginRight: 8 },
  itemContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemMainContent: { flex: 1, marginRight: 8 },
  itemName: { fontSize: 16, fontWeight: '500', color: '#333' },
  itemDescription: { fontSize: 13, color: '#666', marginTop: 2 },
  itemPath: { fontSize: 11, color: '#888', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  itemType: { color: '#00796B', fontSize: 12, fontWeight: '500', marginTop: 2 },
  itemErrorText: { fontSize: 11, color: '#d32f2f', marginTop: 2 },
  itemDetails: { flexDirection: 'row', alignItems: 'center' },
  itemSize: { fontSize: 12, color: '#888', marginRight: 8 },
  separator: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 56 },
  emptyContainer: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 16, textAlign: 'center' },
}); 