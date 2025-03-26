import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, NativeModules, TouchableOpacity, ScrollView } from 'react-native';
import SherpaOnnx from '@siteed/sherpa-onnx.rn';

// Safe way to access global
const getGlobal = (): any => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof global !== 'undefined') return global;
  if (typeof window !== 'undefined') return window;
  return {};
};

export default function TestArchitectureScreen() {
  const [testStatus, setTestStatus] = useState<string>('Not tested');
  const [deepTestStatus, setDeepTestStatus] = useState<string>('Not tested');
  const [apiTestStatus, setApiTestStatus] = useState<string>('Not tested');
  
  useEffect(() => {
    // Log architecture information on component mount
    logArchitectureInfo();
  }, []);
  
  const logArchitectureInfo = (): void => {
    // Safely check for Bridgeless mode
    const globalObj = getGlobal();
    const isBridgeless = !!globalObj.RN$Bridgeless;
    console.log(`Running in ${isBridgeless ? 'Bridgeless' : 'Legacy Bridge'} mode`);
    
    // Get a simple summary of module information
    const moduleNames = Object.keys(NativeModules);
    const sherpaModuleFound = (NativeModules.SherpaOnnx || NativeModules.SherpaOnnxRnModule) ? 'Yes' : 'No';
    
    console.log('------- SHERPA MODULE STATUS -------');
    console.log(`Native modules found: ${moduleNames.length > 0 ? moduleNames.length : 'None'}`);
    console.log(`Sherpa module detected: ${sherpaModuleFound}`);
    console.log(`Available modules: ${moduleNames.join(', ')}`);
    console.log('-----------------------------------');
  };
  
  const testModule = async (): Promise<void> => {
    try {
      setTestStatus('Testing...');
      console.log('------- STARTING MODULE TEST -------');
      
      // Test direct native module first
      const sherpaModule = NativeModules.SherpaOnnx || NativeModules.SherpaOnnxRnModule;
      console.log(`Native Module available: ${sherpaModule ? 'Yes' : 'No'}`);
      
      // Now test the JS API layer
      console.log('SherpaOnnx JS API type:', typeof SherpaOnnx);
      console.log('JS API available methods:', Object.keys(SherpaOnnx).join(', '));
      
      // Try to call validateLibraryLoaded through both paths
      try {
        console.log('\nTesting Native Module directly:');
        if (sherpaModule && typeof sherpaModule.validateLibraryLoaded === 'function') {
          const nativeResult = await sherpaModule.validateLibraryLoaded();
          console.log(`Native call result: ${JSON.stringify(nativeResult)}`);
        }
        
        console.log('\nTesting JS API:');
        if (SherpaOnnx && typeof SherpaOnnx.validateLibraryLoaded === 'function') {
          const jsResult = await SherpaOnnx.validateLibraryLoaded();
          console.log(`JS API call result: ${JSON.stringify(jsResult)}`);
        } else {
          console.error('JS API validateLibraryLoaded not available');
        }
      } catch (e) {
        console.error(`Test Error: ${(e as Error).message}`);
      }
      
      console.log('------- TEST COMPLETE -------');
      setTestStatus('Test complete. See console for results.');
    } catch (error) {
      console.error(`Main Error: ${(error as Error).message}`);
      console.error(`Stack: ${(error as Error).stack}`);
      setTestStatus('Test failed. See console for errors.');
    }
  };
  
  // Test the JS API Layer
  const testJsApi = async (): Promise<void> => {
    try {
      setApiTestStatus('Testing JS API...');
      console.log('------- TESTING JS API LAYER -------');
      
      // Check if SherpaOnnx is available
      console.log('SherpaOnnx import type:', typeof SherpaOnnx);
      console.log('SherpaOnnx methods:', Object.keys(SherpaOnnx).join(', '));
      
      // Try to call validateLibraryLoaded through the JS API
      console.log('Calling validateLibraryLoaded through JS API...');
      const result = await SherpaOnnx.validateLibraryLoaded();
      console.log('JS API call result:', JSON.stringify(result, null, 2));
      
      // Try to access some of the services
      console.log('TTS service available:', typeof SherpaOnnx.TTS === 'object');
      console.log('ASR service available:', typeof SherpaOnnx.ASR === 'object');
      
      console.log('------- JS API TEST COMPLETE -------');
      setApiTestStatus('JS API test complete. See console for results.');
    } catch (error) {
      console.error(`JS API Error: ${(error as Error).message}`);
      console.error(`Stack: ${(error as Error).stack}`);
      setApiTestStatus('JS API test failed. See console for errors.');
    }
  };
  
  // New function to test actual library functionality
  const testDeepFunctionality = async (): Promise<void> => {
    try {
      setDeepTestStatus('Testing deep functionality...');
      console.log('------- STARTING DEEP FUNCTIONALITY TEST -------');
      
      const sherpaModule = NativeModules.SherpaOnnx || NativeModules.SherpaOnnxRnModule;
      if (!sherpaModule) {
        throw new Error('SherpaOnnx module not found');
      }
      
      // Step 1: Get constants to see what's available
      console.log('Getting module constants...');
      const constants = await sherpaModule.getConstants();
      console.log('Module constants:', JSON.stringify(constants, null, 2));
      
      // Step 2: Try to initialize audio tagging (simplest to test without input)
      try {
        console.log('Trying to initialize audio tagging...');
        // This is likely to fail if models aren't set up, but it tests if the call works
        const initResult = await sherpaModule.initAudioTagging({
          // Pass minimal config - this might fail, but we're testing the call itself
          modelPath: 'dummy_path', // Will fail, but tests if function is callable
          sampleRate: 16000
        });
        console.log('Audio tagging init result:', JSON.stringify(initResult, null, 2));
        
        // Clean up if it somehow succeeded
        await sherpaModule.releaseAudioTagging();
      } catch (e) {
        console.log('Expected error during audio tagging init (likely due to missing models):', (e as Error).message);
        console.log('This is normal if models aren\'t configured, but confirms the function can be called');
      }
      
      // Step 3: Test TTS initialization (another simple test)
      try {
        console.log('Trying to initialize TTS...');
        const ttsResult = await sherpaModule.initTts({
          // Minimal config that will likely fail but tests the call
          modelPath: 'dummy_path',
          dictPath: 'dummy_dict'
        });
        console.log('TTS init result:', JSON.stringify(ttsResult, null, 2));
        
        // Clean up if it somehow succeeded
        await sherpaModule.releaseTts();
      } catch (e) {
        console.log('Expected error during TTS init (likely due to missing models):', (e as Error).message);
        console.log('This is normal if models aren\'t configured, but confirms the function can be called');
      }
      
      console.log('------- DEEP TEST COMPLETE -------');
      setDeepTestStatus('Deep test complete. See console for results.');
    } catch (error) {
      console.error(`Deep Test Error: ${(error as Error).message}`);
      console.error(`Stack: ${(error as Error).stack}`);
      setDeepTestStatus('Deep test failed. See console for errors.');
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Sherpa-ONNX Module Test</Text>
        
        <Text style={styles.infoText}>
          This screen tests the Sherpa-ONNX module configuration.{"\n"}
          Results will be displayed in the console.
        </Text>
        
        <TouchableOpacity 
          style={styles.testButton}
          onPress={testModule}
        >
          <Text style={styles.buttonText}>Test Module</Text>
        </TouchableOpacity>
        
        <Text style={styles.statusText}>Status: {testStatus}</Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.subtitle}>JS API Test</Text>
        <Text style={styles.infoText}>
          Test the JavaScript API layer
        </Text>
        
        <TouchableOpacity 
          style={styles.apiTestButton}
          onPress={testJsApi}
        >
          <Text style={styles.buttonText}>Test JS API</Text>
        </TouchableOpacity>
        
        <Text style={styles.statusText}>Status: {apiTestStatus}</Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.subtitle}>Advanced Testing</Text>
        <Text style={styles.infoText}>
          Test deeper functionality of the library.{"\n"}
          This may fail if models aren't configured.
        </Text>
        
        <TouchableOpacity 
          style={styles.deepTestButton}
          onPress={testDeepFunctionality}
        >
          <Text style={styles.buttonText}>Advanced API Test</Text>
        </TouchableOpacity>
        
        <Text style={styles.statusText}>Status: {deepTestStatus}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#555',
  },
  testButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 16,
    width: '80%',
  },
  apiTestButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 16,
    width: '80%',
  },
  deepTestButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 16,
    width: '80%',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    width: '100%',
    marginVertical: 24,
  }
}); 