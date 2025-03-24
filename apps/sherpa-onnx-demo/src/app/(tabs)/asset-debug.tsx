import SherpaOnnx from '@siteed/sherpa-onnx.rn';
import React, { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AssetDebugInfo {
  requestedPath: string;
  exists: boolean;
  size?: number;
  error?: string;
  isDirectory?: boolean;
  fileCount?: number;
  files?: string[];
  variations?: Record<string, boolean>;
  parentDir?: string;
  parentContents?: string[];
  parentDirError?: string;
}

export default function AssetDebugScreen() {
  const [pathToCheck, setPathToCheck] = useState<string>('tts/kokoro-en-v0_19');
  const [debugResult, setDebugResult] = useState<AssetDebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [appDirectories, setAppDirectories] = useState<string[]>([]);
  const [assetList, setAssetList] = useState<string[]>([]);

  // Initialize by scanning app directories to find the assets
  useEffect(() => {
    scanAppDirectories();
  }, []);

  // Scan app directories to find assets folder
  const scanAppDirectories = async () => {
    setIsLoading(true);
    try {
      const dirs = [];
      // Get document directory
      if (FileSystem.documentDirectory) {
        dirs.push({
          name: 'Documents Directory',
          path: FileSystem.documentDirectory
        });
      }
      
      // Get cache directory
      if (FileSystem.cacheDirectory) {
        dirs.push({
          name: 'Cache Directory',
          path: FileSystem.cacheDirectory
        });
      }
      
      // Get bundle directory (iOS only)
      if (Platform.OS === 'ios' && FileSystem.bundleDirectory) {
        dirs.push({
          name: 'Bundle Directory',
          path: FileSystem.bundleDirectory
        });
      }

      // Try to find the assets folder in each directory
      const results = [];
      for (const dir of dirs) {
        try {
          const files = await FileSystem.readDirectoryAsync(dir.path);
          results.push(`${dir.name}: ${files.join(', ')}`);
          
          // Look for assets or asset folder
          const assetsFolder = files.find(f => 
            f.toLowerCase() === 'assets' || 
            f.toLowerCase() === 'asset'
          );
          
          if (assetsFolder) {
            const assetPath = `${dir.path}${assetsFolder}/`;
            results.push(`  Found assets at: ${assetPath}`);
            
            // Try to list contents of the assets folder
            try {
              const assetContents = await FileSystem.readDirectoryAsync(assetPath);
              results.push(`  Contents: ${assetContents.join(', ')}`);
              
              // If we found a tts folder, list its contents too
              const ttsFolder = assetContents.find(f => f.toLowerCase() === 'tts');
              if (ttsFolder) {
                const ttsPath = `${assetPath}${ttsFolder}/`;
                try {
                  const ttsContents = await FileSystem.readDirectoryAsync(ttsPath);
                  results.push(`  TTS contents: ${ttsContents.join(', ')}`);
                  
                  // If we found the model we're looking for, check its contents
                  const modelFolder = ttsContents.find(f => f.includes('kokoro'));
                  if (modelFolder) {
                    const modelPath = `${ttsPath}${modelFolder}/`;
                    try {
                      const modelContents = await FileSystem.readDirectoryAsync(modelPath);
                      results.push(`  Model contents: ${modelContents.join(', ')}`);
                    } catch (error) {
                      results.push(`  Error reading model directory: ${error}`);
                    }
                  }
                } catch (error) {
                  results.push(`  Error reading TTS directory: ${error}`);
                }
              }
            } catch (error) {
              results.push(`  Error reading assets directory: ${error}`);
            }
          }
        } catch (error) {
          results.push(`Error reading ${dir.name}: ${error}`);
        }
      }
      
      setAppDirectories(results);
      
      // Now let's try a different approach - listing all app assets directly
      try {
        // Use Expo Asset to manually load a known asset and examine its path
        const testAsset = Asset.fromModule(require('../../../assets/adaptive-icon.png'));
        await testAsset.downloadAsync();
        
        if (testAsset.localUri) {
          const assetPath = testAsset.localUri.split('adaptive-icon.png')[0];
          results.push(`Found adaptive-icon.png at: ${testAsset.localUri}`);
          results.push(`Extracted asset base path: ${assetPath}`);
          
          // Try to look for our model files based on this path
          const possibleModelPaths = [
            `${assetPath}tts/kokoro-en-v0_19/model.onnx`,
            `${assetPath}assets/tts/kokoro-en-v0_19/model.onnx`,
            `${assetPath.replace('assets/', '')}tts/kokoro-en-v0_19/model.onnx`
          ];
          
          for (const path of possibleModelPaths) {
            try {
              const info = await FileSystem.getInfoAsync(path);
              results.push(`Checking ${path}: ${info.exists ? 'EXISTS!' : 'not found'}`);
              if (info.exists) {
                results.push(`File size: ${info.size} bytes`);
              }
            } catch (error) {
              results.push(`Error checking ${path}: ${error}`);
            }
          }
        }
      } catch (error) {
        results.push(`Error in direct asset approach: ${error}`);
      }
      
      setAppDirectories(results);
      
    } catch (error) {
      console.error('Error scanning directories:', error);
      setAppDirectories([`Error: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };

  // Use direct approach to list assets from native code
  const listAllAssetsNative = async () => {
    setIsLoading(true);
    try {
      console.log("\n================ NATIVE ASSETS LISTING ================");
      // Call the native module's listAllAssets method
      const result = await SherpaOnnx.listAllAssets();
      
      if (result && result.assets) {
        console.log(`Found ${result.count} assets in native module:`);
        // Log each asset path - easier to copy from console
        result.assets.forEach((asset, index) => {
          console.log(`${index+1}. ${asset}`);
        });
        
        // Log paths that might contain model files
        const modelPaths = result.assets.filter(path => 
          path.includes('model.onnx') || 
          path.includes('voices.bin') || 
          path.includes('tokens.txt') ||
          path.includes('kokoro')
        );
        
        if (modelPaths.length > 0) {
          console.log("\n================ POTENTIAL MODEL FILES ================");
          modelPaths.forEach(path => {
            console.log(path);
          });
        }
        
        setAssetList(result.assets);
      } else {
        console.log('Failed to list assets or no assets found');
      }
    } catch (error) {
      console.log(`Error listing assets: ${error}`);
    } finally {
      console.log("\n================ ASSET LISTING COMPLETE ================");
      setIsLoading(false);
    }
  };
  
  // Find and extract model files if possible
  const extractModelFiles = async () => {
    setIsLoading(true);
    try {
      console.log("\n================ MODEL FILE EXTRACTION ================");
      // First try to find where assets are located using a known asset
      const iconAsset = Asset.fromModule(require('../../../assets/adaptive-icon.png'));
      await iconAsset.downloadAsync();
      
      if (!iconAsset.localUri) {
        console.log("ERROR: Could not get local URI for test asset");
        throw new Error('Could not get local URI for test asset');
      }
      
      // Log where we found the asset
      console.log(`Found icon at: ${iconAsset.localUri}`);
      
      // Extract the base path (remove the filename)
      const assetPath = iconAsset.localUri.split('adaptive-icon.png')[0];
      console.log(`Base asset path appears to be: ${assetPath}`);
      
      // Create a directory to extract model files
      const extractDir = `${FileSystem.documentDirectory}extracted_models/`;
      await FileSystem.makeDirectoryAsync(extractDir, { intermediates: true });
      
      // Get list of all assets from native module
      const nativeAssets = await SherpaOnnx.listAllAssets();
      const assetFiles = nativeAssets?.assets || [];
      
      // Filter to find model files
      const modelFiles = assetFiles.filter(file => 
        file.includes('model.onnx') || 
        file.includes('voices.bin') || 
        file.includes('tokens.txt')
      );
      
      // Try to extract each file
      const extractResults = [];
      for (const file of modelFiles) {
        try {
          const filename = file.split('/').pop();
          const targetPath = `${extractDir}${filename}`;
          
          // Assume the file exists at various potential locations
          const possiblePaths = [
            `${assetPath}${file}`,
            `${FileSystem.bundleDirectory}${file}`,
            `${FileSystem.bundleDirectory}assets/${file}`
          ];
          
          let extracted = false;
          for (const sourcePath of possiblePaths) {
            try {
              const fileInfo = await FileSystem.getInfoAsync(sourcePath);
              if (fileInfo.exists) {
                await FileSystem.copyAsync({
                  from: sourcePath,
                  to: targetPath
                });
                extractResults.push(`Extracted ${file} to ${targetPath}`);
                extracted = true;
                break;
              }
            } catch (e) {
              // Try next path
            }
          }
          
          if (!extracted) {
            extractResults.push(`Could not extract ${file}`);
          }
        } catch (error) {
          extractResults.push(`Error extracting ${file}: ${error}`);
        }
      }
      
      setAppDirectories(extractResults);
    } catch (error) {
      console.error('Error extracting model files:', error);
      setAppDirectories([`Error: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a simple wrapper for comprehensive console logging
  const runFullAssetSearch = () => {
    console.log("\n\n=========== STARTING COMPREHENSIVE ASSET SEARCH ===========");
    scanAppDirectories().then(() => {
      console.log("\n=========== FILE SCAN COMPLETE, STARTING NATIVE ASSET LIST ===========");
      listAllAssetsNative();
    });
  };

  // Add this function right after your imports
  const validateAssetPaths = async () => {
    console.log("\n=========== VALIDATING ASSET PATHS WITH EXPO ASSET API ===========");
    
    try {
      // Try different require paths to see which one works
      const testPaths = [
        { name: "Direct path", path: () => require('../../../assets/tts/kokoro-en-v0_19/model.onnx') },
        { name: "With assets prefix", path: () => require('../../../assets/assets/tts/kokoro-en-v0_19/model.onnx') },
        { name: "No tts folder", path: () => require('../../../assets/kokoro-en-v0_19/model.onnx') },
        { name: "Just model", path: () => require('../../../assets/model.onnx') }
      ];
      
      for (const test of testPaths) {
        try {
          console.log(`Testing ${test.name}...`);
          const moduleId = test.path();
          console.log(`  ✅ Require succeeded: ${moduleId}`);
          
          const asset = Asset.fromModule(moduleId);
          await asset.downloadAsync();
          
          console.log(`  ✅ Asset loaded successfully!`);
          console.log(`  • Asset name: ${asset.name}`);
          console.log(`  • Asset type: ${asset.type}`);
          console.log(`  • Local URI: ${asset.localUri}`);
          console.log(`  • URI: ${asset.uri}`);
          console.log(`  • File exists and is bundled correctly`);
          
          return asset.localUri; // Return the correct path if found
        } catch (err: unknown) {
          // Properly handle the unknown error type
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.log(`  ❌ Error: ${errorMessage}`);
        }
      }
      
      console.log("❌ None of the asset paths worked. Your models aren't correctly bundled.");
      return null;
    } catch (err: unknown) {
      // Properly handle the unknown error type
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.log(`❌ Error validating assets: ${errorMessage}`);
      return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Asset Path Finder</Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.button}
            onPress={scanAppDirectories}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Scan App Directories</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={listAllAssetsNative}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>List Native Assets</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={extractModelFiles}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Find & Extract Model Files</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#FF5722' }]}
          onPress={runFullAssetSearch}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>📋 LOG ALL ASSET INFO (Check Console)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#4CAF50' }]}
          onPress={async () => {
            const correctPath = await validateAssetPaths();
            if (correctPath) {
              console.log("\n✅ CORRECT MODEL PATH FOUND:", correctPath);
              console.log("Use this path in your model configuration");
            } else {
              console.log("\n❌ MODEL FILES NOT FOUND IN BUNDLE");
              console.log("Check that your assets are correctly included in your build");
            }
          }}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Validate Asset Paths</Text>
        </TouchableOpacity>
        
        {isLoading && (
          <Text style={styles.loading}>Working on it...</Text>
        )}
        
        {/* App Directory Results */}
        {appDirectories.length > 0 && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>App Directories:</Text>
            {appDirectories.map((dir, index) => (
              <Text key={index} style={styles.resultDetail}>{dir}</Text>
            ))}
          </View>
        )}
        
        {/* Asset List Results */}
        {assetList.length > 0 && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Assets from Native ({assetList.length}):</Text>
            {assetList.map((asset, index) => (
              <Text key={index} style={styles.fileItem}>{asset}</Text>
            ))}
          </View>
        )}
        
        {/* Quick Results for Model Paths */}
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Quick Model Path Check:</Text>
          <Text style={styles.helpText}>Try these paths in your app:</Text>
          <Text style={styles.codeText}>• tts/kokoro-en-v0_19</Text>
          <Text style={styles.codeText}>• assets/tts/kokoro-en-v0_19</Text>
          <Text style={styles.codeText}>• kokoro-en-v0_19</Text>
          <Text style={styles.codeText}>• android/app/src/main/assets/tts/kokoro-en-v0_19</Text>
          
          <Text style={styles.helpText}>
            If none work, add FS_DEBUG=* to your environment variables or use the
            extract function above to copy files to a known location.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loading: {
    alignSelf: 'center',
    marginVertical: 16,
    fontStyle: 'italic',
  },
  resultContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultDetail: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  fileItem: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginLeft: 8,
    marginBottom: 2,
  },
  helpText: {
    fontSize: 14, 
    marginVertical: 8,
  },
  codeText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#eee',
    padding: 4,
    marginVertical: 2,
  },
}); 