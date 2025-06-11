import { beforeEach, describe, it, expect, afterAll } from '@jest/globals'
import { by, element, device, waitFor } from 'detox'

describe('File Size Validation', () => {
  // Fixed 60-second duration for all tests
  const RECORDING_DURATION = 60;
  
  beforeEach(async () => {
    // Use agent validation workflow
    await device.launchApp({
      newInstance: true,
      permissions: { microphone: 'YES' },
      launchArgs: { 
        detoxDebug: 'true',
        AGENT_VALIDATION: 'true'
      }
    });
  });

  const runFileSizeTest = async (config: {
    name: string,
    sampleRate: number,
    channels: number,
    encoding: string,
    compressed?: boolean,
    compressionFormat?: string,
    bitrate?: number
  }) => {
    console.log(`\n🎯 AGENT VALIDATION: File size collection for ${config.name} on ${device.getPlatform()}`);
    
    // Step 1: Build recording config object
    const recordingConfig: any = {
      sampleRate: config.sampleRate,
      channels: config.channels,
      encoding: config.encoding,
      keepAwake: true,
      output: {
        primary: {
          enabled: !config.compressed // Only enable primary if not compressed
        }
      }
    };

    // Add compression configuration if needed
    if (config.compressed) {
      recordingConfig.output.compressed = {
        enabled: true,
        format: config.compressionFormat,
        bitrate: config.bitrate
      };
    }

    // Step 2: Encode config to base64
    const base64Config = Buffer.from(JSON.stringify(recordingConfig)).toString('base64');
    
    // Step 3: Configure via deep link with base64 config
    await device.openURL({ 
      url: `audioplayground://agent-validation?config=${base64Config}` 
    });

    // Step 4: Validate configuration loaded
    await waitFor(element(by.id('agent-config')))
      .toBeVisible()
      .withTimeout(10000);
    console.log('✅ Agent validation configured');
    
    // Step 5: Start recording
    await element(by.id('start-recording-button')).tap();
    
    // Step 6: Validate recording started
    await waitFor(element(by.id('recording-active-indicator')))
      .toExist()
      .withTimeout(5000);
    
    await waitFor(element(by.id('start-recording-result')))
      .toBeVisible()
      .whileElement(by.id('agent-validation-wrapper'))
      .scroll(200, 'down', NaN, 0.5);
    console.log('✅ Recording started');

    // Step 7: Record for exactly 60 seconds
    console.log(`⏱️  Recording for ${RECORDING_DURATION} seconds...`);
    const recordingStartTime = Date.now();
    
    // Wait for exactly 60 seconds from start
    await new Promise(resolve => {
      const targetEndTime = recordingStartTime + (RECORDING_DURATION * 1000);
      const remainingTime = targetEndTime - Date.now();
      setTimeout(resolve, remainingTime);
    });

    // Step 8: Stop recording at exact time
    const actualDuration = (Date.now() - recordingStartTime) / 1000;
    console.log(`⏱️  Actual recording duration: ${actualDuration.toFixed(1)}s`);
    await element(by.id('stop-recording-button')).tap();
    console.log('🔴 Stop recording triggered');

    // Step 9: Validate recording stopped
    await waitFor(element(by.id('recording-stopped-indicator')))
      .toExist()
      .withTimeout(10000);
    
    // Step 10: Extract file size
    await waitFor(element(by.id('final-recording-result')))
      .toBeVisible()
      .whileElement(by.id('agent-validation-wrapper'))
      .scroll(200, 'down', NaN, 0.5);
      
    let fileSize = 'N/A';
    let fileSizeMB = 0;
    let actualRecordedDuration = 0;
    
    try {
      const finalResultElement = await element(by.id('final-recording-result')).getAttributes();
      if (finalResultElement && 'text' in finalResultElement && finalResultElement.text) {
        const result = JSON.parse(finalResultElement.text);
        
        // For compressed recordings, use compression.size if available
        if (config.compressed && result.compression && result.compression.size) {
          fileSizeMB = (result.compression.size) / (1024 * 1024);
          fileSize = fileSizeMB.toFixed(2) + 'MB (compressed)';
          console.log('Using compressed size:', result.compression.size);
        } else {
          fileSizeMB = (result.size || 0) / (1024 * 1024);
          fileSize = fileSizeMB.toFixed(2) + 'MB';
          console.log('Using primary size:', result.size, 'compression:', result.compression);
        }
        
        actualRecordedDuration = (result.durationMs || 0) / 1000; // Convert to seconds
      }
    } catch (e) {
      console.log('⚠️  Could not extract file size');
    }

    // Step 11: Report results
    console.log('\n📊 AGENT VALIDATION RESULT:');
    console.log('=====================================');
    console.log(`Platform: ${device.getPlatform()}`);
    console.log(`Configuration: ${config.name}`);
    console.log(`Target Duration: ${RECORDING_DURATION}s`);
    console.log(`Actual Duration: ${actualRecordedDuration.toFixed(1)}s`);
    console.log(`File Size: ${fileSize}`);
    if (config.compressed) {
      console.log(`Compression: ${config.compressionFormat} @ ${config.bitrate}bps`);
    }
    console.log('=====================================\n');
    
    return { 
      platform: device.getPlatform(),
      config: config.name,
      sampleRate: config.sampleRate,
      channels: config.channels,
      encoding: config.encoding,
      compressed: config.compressed,
      compressionFormat: config.compressionFormat,
      bitrate: config.bitrate,
      fileSize,
      fileSizeMB,
      actualDuration: actualRecordedDuration
    };
  };

  // Test configurations
  it('should validate Voice Low configuration file size', async () => {
    const result = await runFileSizeTest({
      name: 'Voice Low',
      sampleRate: 16000,
      channels: 1,
      encoding: 'pcm_8bit'
    });
    
    expect(result.fileSizeMB).toBeGreaterThan(0);
    expect(result.fileSizeMB).toBeLessThan(2); // 8-bit mono should be < 2MB for 60s
    expect(result.actualDuration).toBeGreaterThan(59); // Allow 1 second variance
    expect(result.actualDuration).toBeLessThan(61);
    console.log(`✅ PASS: Voice Low = ${result.fileSize}`);
  });

  it('should validate Voice Standard configuration file size', async () => {
    const result = await runFileSizeTest({
      name: 'Voice Standard',
      sampleRate: 16000,
      channels: 1,
      encoding: 'pcm_16bit'
    });
    
    expect(result.fileSizeMB).toBeGreaterThan(0);
    expect(result.fileSizeMB).toBeLessThan(4); // 16-bit mono should be < 4MB for 60s
    console.log(`✅ PASS: Voice Standard = ${result.fileSize}`);
  });

  it('should validate Voice Compressed (Opus/AAC 32k) configuration file size', async () => {
    // Use AAC on iOS since Opus is not supported
    const format = device.getPlatform() === 'ios' ? 'aac' : 'opus';
    
    const result = await runFileSizeTest({
      name: 'Voice Compressed 32k',
      sampleRate: 16000,
      channels: 1,
      encoding: 'pcm_16bit',
      compressed: true,
      compressionFormat: format,
      bitrate: 32000
    });
    
    expect(result.fileSizeMB).toBeGreaterThan(0);
    expect(result.fileSizeMB).toBeLessThan(1.5); // Allow some margin for format differences
    console.log(`✅ PASS: Voice Compressed (${format} 32k) = ${result.fileSize}`);
  });

  it('should validate Voice Compressed (AAC 64k) configuration file size', async () => {
    const result = await runFileSizeTest({
      name: 'Voice Compressed AAC 64k',
      sampleRate: 16000,
      channels: 1,
      encoding: 'pcm_16bit',
      compressed: true,
      compressionFormat: 'aac',
      bitrate: 64000
    });
    
    expect(result.fileSizeMB).toBeGreaterThan(0);
    expect(result.fileSizeMB).toBeLessThan(2); // ~0.5MB per minute expected
    console.log(`✅ PASS: Voice Compressed (AAC 64k) = ${result.fileSize}`);
  });

  it('should validate Audio Book configuration file size', async () => {
    const result = await runFileSizeTest({
      name: 'Audio Book',
      sampleRate: 44100,
      channels: 1,
      encoding: 'pcm_16bit'
    });
    
    expect(result.fileSizeMB).toBeGreaterThan(0);
    expect(result.fileSizeMB).toBeLessThan(10); // 44.1kHz mono should be < 10MB for 60s
    console.log(`✅ PASS: Audio Book = ${result.fileSize}`);
  });

  it('should validate Music Standard configuration file size', async () => {
    const result = await runFileSizeTest({
      name: 'Music Standard',
      sampleRate: 44100,
      channels: 2,
      encoding: 'pcm_16bit'
    });
    
    expect(result.fileSizeMB).toBeGreaterThan(0);
    expect(result.fileSizeMB).toBeLessThan(20); // 44.1kHz stereo should be < 20MB for 60s
    console.log(`✅ PASS: Music Standard = ${result.fileSize}`);
  });

  it('should validate Music Compressed (AAC 128k) configuration file size', async () => {
    const result = await runFileSizeTest({
      name: 'Music Compressed AAC 128k',
      sampleRate: 44100,
      channels: 2,
      encoding: 'pcm_16bit',
      compressed: true,
      compressionFormat: 'aac',
      bitrate: 128000
    });
    
    expect(result.fileSizeMB).toBeGreaterThan(0);
    expect(result.fileSizeMB).toBeLessThan(2); // AAC 128k should be < 2MB for 60s
    console.log(`✅ PASS: Music Compressed (AAC 128k) = ${result.fileSize}`);
  });

  it('should validate Music Compressed (AAC 256k) configuration file size', async () => {
    const result = await runFileSizeTest({
      name: 'Music Compressed AAC 256k',
      sampleRate: 44100,
      channels: 2,
      encoding: 'pcm_16bit',
      compressed: true,
      compressionFormat: 'aac',
      bitrate: 256000
    });
    
    expect(result.fileSizeMB).toBeGreaterThan(0);
    expect(result.fileSizeMB).toBeLessThan(4); // AAC 256k should be < 4MB for 60s
    console.log(`✅ PASS: Music Compressed (AAC 256k) = ${result.fileSize}`);
  });

  it('should validate Professional configuration file size', async () => {
    const result = await runFileSizeTest({
      name: 'Professional',
      sampleRate: 48000,
      channels: 2,
      encoding: 'pcm_32bit'
    });
    
    expect(result.fileSizeMB).toBeGreaterThan(0);
    expect(result.fileSizeMB).toBeLessThan(30); // 48kHz stereo 32-bit should be < 30MB for 60s
    console.log(`✅ PASS: Professional = ${result.fileSize}`);
  });

  // Summary report
  afterAll(() => {
    console.log('\n🏁 AGENT VALIDATION SUMMARY');
    console.log('===========================');
    console.log('File size validation completed using agent workflow');
    console.log('Check individual test results above for configuration-specific file sizes');
    console.log('\n📋 RESULTS FOR DOCUMENTATION:');
    console.log('Extract file sizes from test output above to populate documentation table');
  });
});