/**
 * Test: Runtime model download for web
 *
 * Hypothesis: We can fetch model files from arbitrary URLs,
 * write them to Emscripten FS, and pass paths to sherpa-onnx C API.
 *
 * Test uses VAD (silero_vad.onnx, ~2MB) as it's the simplest feature.
 */

// Test 2: External URL strategies
window.__testExternalFetch = async function() {
  var results = [];
  var log = function(msg) { results.push(msg); console.log('[EXT-TEST] ' + msg); };

  // URLs to test (all should have the silero_vad.onnx or similar small model)
  var urls = [
    {
      name: 'GitHub Release (direct)',
      url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx'
    },
    {
      name: 'HuggingFace (resolve)',
      url: 'https://huggingface.co/csukuangfj/sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20/resolve/main/silero_vad.onnx'
    },
    {
      name: 'GitHub Raw (via raw.githubusercontent)',
      url: 'https://raw.githubusercontent.com/k2-fsa/sherpa-onnx/master/sherpa-onnx/assets/silero_vad.onnx'
    }
  ];

  for (var i = 0; i < urls.length; i++) {
    var entry = urls[i];
    try {
      log('Testing: ' + entry.name);
      var response = await fetch(entry.url, { mode: 'cors' });
      if (response.ok) {
        var ct = response.headers.get('content-type') || 'unknown';
        var size = response.headers.get('content-length') || 'unknown';
        log('  OK - status=' + response.status + ' type=' + ct + ' size=' + size);
        // Don't download full body, just check headers
      } else {
        log('  FAIL - status=' + response.status);
      }
    } catch (e) {
      log('  ERROR: ' + e.message);
    }
  }

  // Test: Can we use a simple no-CORS opaque response with a blob?
  log('Testing opaque fetch (no-cors mode)...');
  try {
    var opaqueResp = await fetch('https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx', { mode: 'no-cors' });
    log('  Opaque status: ' + opaqueResp.status + ' type: ' + opaqueResp.type);
    // With no-cors, response body is not accessible
    try {
      var blob = await opaqueResp.blob();
      log('  Blob size: ' + blob.size + ' (0 means opaque, inaccessible)');
    } catch (be) {
      log('  Blob error: ' + be.message);
    }
  } catch (e) {
    log('  no-cors ERROR: ' + e.message);
  }

  return { log: results };
};

window.__testRuntimeDownload = async function() {
  const results = [];
  const log = (msg) => { results.push(msg); console.log('[RT-TEST] ' + msg); };

  try {
    // Step 1: Check Module and FS are available
    if (!window.Module) return { error: 'Module not loaded' };
    if (!window.Module.FS) return { error: 'Module.FS not available' };
    log('Module.FS available');

    // Step 2: Check what FS operations we have
    const fsOps = {
      writeFile: typeof Module.FS.writeFile,
      readFile: typeof Module.FS.readFile,
      mkdir: typeof Module.FS.mkdir,
      stat: typeof Module.FS.stat,
      readdir: typeof Module.FS.readdir
    };
    log('FS ops: ' + JSON.stringify(fsOps));

    // Step 3: List root FS contents
    try {
      const rootContents = Module.FS.readdir('/');
      log('Root FS: ' + JSON.stringify(rootContents));
    } catch (e) {
      log('Cannot list root: ' + e.message);
    }

    // Step 4: Test basic FS write/read
    try {
      Module.FS.writeFile('/test_file.txt', 'hello world');
      const content = Module.FS.readFile('/test_file.txt', { encoding: 'utf8' });
      log('Basic FS write/read: ' + (content === 'hello world' ? 'PASS' : 'FAIL: ' + content));
      Module.FS.unlink('/test_file.txt');
    } catch (e) {
      log('Basic FS write/read FAIL: ' + e.message);
    }

    // Step 5: Test binary FS write (simulating model file)
    try {
      const testData = new Uint8Array([0x4f, 0x4e, 0x4e, 0x58]); // "ONNX" magic bytes
      Module.FS.writeFile('/test_binary.onnx', testData);
      const readBack = Module.FS.readFile('/test_binary.onnx');
      log('Binary write/read: ' + (readBack.length === 4 ? 'PASS' : 'FAIL: len=' + readBack.length));
      Module.FS.unlink('/test_binary.onnx');
    } catch (e) {
      log('Binary write/read FAIL: ' + e.message);
    }

    // Step 6: Test mkdir + nested write
    try {
      Module.FS.mkdir('/test-models');
      Module.FS.writeFile('/test-models/test.onnx', new Uint8Array([1, 2, 3]));
      const stat = Module.FS.stat('/test-models/test.onnx');
      log('Nested write: PASS (size=' + stat.size + ')');
      Module.FS.unlink('/test-models/test.onnx');
      Module.FS.rmdir('/test-models');
    } catch (e) {
      log('Nested write FAIL: ' + e.message);
    }

    // Step 7: Fetch a real model from GitHub releases (silero_vad.onnx ~2MB)
    // Using the official sherpa-onnx release
    const vadModelUrl = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx';
    log('Fetching VAD model from GitHub...');

    try {
      const response = await fetch(vadModelUrl);
      if (!response.ok) {
        // GitHub might redirect, try with redirect follow
        log('Direct fetch status: ' + response.status + ' - trying alternate URL');
        // Try huggingface mirror or raw content
        const altUrl = 'https://huggingface.co/csukuangfj/sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20/resolve/main/silero_vad.onnx';
        const altResponse = await fetch(altUrl);
        if (!altResponse.ok) {
          log('Alt fetch also failed: ' + altResponse.status);
          // Fall back to local asset to test the FS part at least
          log('Falling back to local /wasm/vad/silero_vad.onnx');
          const localResponse = await fetch('/wasm/vad/silero_vad.onnx');
          if (!localResponse.ok) {
            log('Local VAD model not found either');
          } else {
            const localBuffer = await localResponse.arrayBuffer();
            log('Local VAD model fetched: ' + localBuffer.byteLength + ' bytes');

            // Write to a NEW path (not the one used by pre-loaded assets)
            Module.FS.mkdir('/runtime-vad');
            Module.FS.writeFile('/runtime-vad/silero_vad.onnx', new Uint8Array(localBuffer));
            const stat = Module.FS.stat('/runtime-vad/silero_vad.onnx');
            log('Wrote to /runtime-vad/silero_vad.onnx: ' + stat.size + ' bytes');

            // Try creating VAD with the runtime-downloaded model
            log('Attempting to create VAD with runtime-downloaded model...');
            try {
              var vadResult = await testVadWithPath('/runtime-vad/silero_vad.onnx');
              log('VAD creation: ' + vadResult);
            } catch (ve) {
              log('VAD creation failed: ' + ve.message);
            }
          }
        } else {
          const buffer = await altResponse.arrayBuffer();
          log('HuggingFace VAD model: ' + buffer.byteLength + ' bytes');
          Module.FS.mkdir('/runtime-vad');
          Module.FS.writeFile('/runtime-vad/silero_vad.onnx', new Uint8Array(buffer));
          log('Wrote to Emscripten FS');

          try {
            var vadResult = await testVadWithPath('/runtime-vad/silero_vad.onnx');
            log('VAD creation: ' + vadResult);
          } catch (ve) {
            log('VAD creation failed: ' + ve.message);
          }
        }
      } else {
        const buffer = await response.arrayBuffer();
        log('GitHub VAD model: ' + buffer.byteLength + ' bytes');

        Module.FS.mkdir('/runtime-vad');
        Module.FS.writeFile('/runtime-vad/silero_vad.onnx', new Uint8Array(buffer));
        log('Wrote to Emscripten FS');

        try {
          var vadResult = await testVadWithPath('/runtime-vad/silero_vad.onnx');
          log('VAD creation: ' + vadResult);
        } catch (ve) {
          log('VAD creation failed: ' + ve.message);
        }
      }
    } catch (fetchErr) {
      log('Fetch error (CORS?): ' + fetchErr.message);

      // Even if external fetch fails, test with local file
      log('Testing with local /wasm/vad/silero_vad.onnx instead...');
      try {
        const localResponse = await fetch('/wasm/vad/silero_vad.onnx');
        const ct = localResponse.headers.get('content-type') || '';
        if (ct.includes('text/html')) {
          log('Local VAD model returns HTML (not found / SPA fallback)');
        } else if (localResponse.ok) {
          const localBuffer = await localResponse.arrayBuffer();
          log('Local VAD model: ' + localBuffer.byteLength + ' bytes');

          try { Module.FS.mkdir('/runtime-vad'); } catch(e) {}
          Module.FS.writeFile('/runtime-vad/silero_vad.onnx', new Uint8Array(localBuffer));
          log('Wrote to /runtime-vad/silero_vad.onnx');

          try {
            var vadResult = await testVadWithPath('/runtime-vad/silero_vad.onnx');
            log('VAD creation: ' + vadResult);
          } catch (ve) {
            log('VAD creation failed: ' + ve.message);
          }
        }
      } catch (le) {
        log('Local fetch also failed: ' + le.message);
      }
    }

    // Step 8: Check IndexedDB availability (for caching)
    try {
      const hasIDB = typeof indexedDB !== 'undefined';
      log('IndexedDB available: ' + hasIDB);
      if (hasIDB) {
        // Emscripten IDBFS can persist FS to IndexedDB
        const hasIDBFS = !!(Module.FS && Module.FS.filesystems && Module.FS.filesystems.IDBFS);
        log('Emscripten IDBFS available: ' + hasIDBFS);
      }
    } catch (e) {
      log('IndexedDB check error: ' + e.message);
    }

    return { success: true, log: results };
  } catch (error) {
    log('FATAL: ' + error.message);
    return { success: false, log: results, error: error.message };
  }
};

// Helper: Try to create a VAD detector with a given model path
async function testVadWithPath(modelPath) {
  var M = window.Module;

  // Check if SherpaOnnx.VAD is available
  if (window.SherpaOnnx && window.SherpaOnnx.VAD) {
    // Use the high-level API
    var loadedModel = { modelDir: 'runtime-vad', fileName: 'silero_vad.onnx', modelPath: modelPath };
    var vad = window.SherpaOnnx.VAD.createVoiceActivityDetector(loadedModel, {
      threshold: 0.5,
      minSilenceDuration: 0.3,
      minSpeechDuration: 0.1,
      windowSize: 512,
      sampleRate: 16000,
      debug: true
    });

    if (vad && vad.handle) {
      // Feed some silence to test it works
      var silence = new Float32Array(512);
      vad.acceptWaveform(silence);
      var detected = vad.detected();
      vad.free();
      return 'SUCCESS - VAD created and processed audio (detected=' + detected + ')';
    }
    return 'FAIL - VAD handle is null';
  }

  // Fallback: Use C API directly
  // Build SileroVad config struct
  var modelStr = M._malloc(M.lengthBytesUTF8(modelPath) + 1);
  M.stringToUTF8(modelPath, modelStr, M.lengthBytesUTF8(modelPath) + 1);

  // SherpaOnnxSileroVadModelConfig: model(ptr), threshold(f), min_silence(f), min_speech(f), window_size(i32), max_speech(f)
  var sileroPtr = M._malloc(6 * 4);
  M.setValue(sileroPtr + 0, modelStr, 'i8*');
  M.setValue(sileroPtr + 4, 0.5, 'float');
  M.setValue(sileroPtr + 8, 0.3, 'float');
  M.setValue(sileroPtr + 12, 0.1, 'float');
  M.setValue(sileroPtr + 16, 512, 'i32');
  M.setValue(sileroPtr + 20, 30.0, 'float');

  // SherpaOnnxVadModelConfig: silero(24) + sample_rate(i32) + num_threads(i32) + provider(ptr) + debug(i32) + ten_vad(24)
  var providerStr = M._malloc(4);
  M.stringToUTF8('cpu', providerStr, 4);

  var vadConfigPtr = M._malloc(64);
  // Zero it
  M.HEAP8.fill(0, vadConfigPtr, vadConfigPtr + 64);
  M._CopyHeap(sileroPtr, 24, vadConfigPtr);
  M.setValue(vadConfigPtr + 24, 16000, 'i32');
  M.setValue(vadConfigPtr + 28, 1, 'i32');
  M.setValue(vadConfigPtr + 32, providerStr, 'i8*');
  M.setValue(vadConfigPtr + 36, 1, 'i32');
  // ten_vad at offset 40 is all zeros (unused)

  var vadHandle = M._SherpaOnnxCreateVoiceActivityDetector(vadConfigPtr, 5.0);

  M._free(sileroPtr);
  M._free(vadConfigPtr);

  if (vadHandle) {
    // Test with silence
    var samples = new Float32Array(512);
    var samplesPtr = M._malloc(512 * 4);
    M.HEAPF32.set(samples, samplesPtr / 4);
    M._SherpaOnnxVoiceActivityDetectorAcceptWaveform(vadHandle, samplesPtr, 512);
    var detected = M._SherpaOnnxVoiceActivityDetectorDetected(vadHandle);
    M._free(samplesPtr);
    M._SherpaOnnxDestroyVoiceActivityDetector(vadHandle);
    return 'SUCCESS (C API) - VAD created, detected=' + detected;
  }

  return 'FAIL - C API returned null handle';
}
