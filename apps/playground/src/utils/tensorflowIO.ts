import * as FileSystem from 'expo-file-system';
import * as tf from '@tensorflow/tfjs';
import { Platform } from 'react-native';

export async function loadModelFromAssets(modelPath: string): Promise<tf.GraphModel> {
  if (Platform.OS === 'web') {
    // For web, use HTTP requests
    return await tf.loadGraphModel(modelPath);
  } else {
    // For native, use Expo FileSystem
    // Read the model.json file
    const modelJsonPath = `${FileSystem.documentDirectory}${modelPath}`;
    const modelJson = await FileSystem.readAsStringAsync(modelJsonPath);
    // Parse it to get the structure but we don't need to use it directly
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _modelConfig = JSON.parse(modelJson);
    
    // Create a custom IO handler for loading from Expo's FileSystem
    const modelUrl = `file://${modelJsonPath}`;
    
    // Use a properly typed fetchFunc that matches the RequestInit interface
    return await tf.loadGraphModel(modelUrl, {
      // Fix the fetchFunc type by using the correct parameter type
      fetchFunc: async (input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
        // Convert input to string
        const path = input.toString();
        // Extract the file name from the path
        const fileName = path.split('/').pop() || '';
        const filePath = `${FileSystem.documentDirectory}${modelPath.replace('model.json', fileName)}`;
        
        // Read the file content
        const content = await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.Base64
        });
        
        // Convert base64 to ArrayBuffer
        const buffer = tf.util.encodeString(content, 'base64').buffer;
        
        // Fix the Blob creation by ensuring the buffer is properly typed
        // Convert ArrayBufferLike to a proper ArrayBuffer to satisfy BlobPart
        const arrayBuffer = buffer as ArrayBuffer;
        return new Response(new Blob([arrayBuffer]));
      }
    });
  }
} 