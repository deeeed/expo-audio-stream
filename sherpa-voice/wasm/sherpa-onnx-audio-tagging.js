/**
 * sherpa-onnx-audio-tagging.js
 *
 * Audio Tagging functionality for SherpaOnnx
 * Requires sherpa-onnx-core.js to be loaded first
 */

(function(global) {
  if (!global.SherpaOnnx) {
    console.error('SherpaOnnx namespace not found. Make sure to load sherpa-onnx-core.js first.');
    return;
  }

  const SherpaOnnx = global.SherpaOnnx;

  // --- WASM struct init helpers ---

  // SherpaOnnxOfflineZipformerAudioTaggingModelConfig = { model: ptr }
  // SherpaOnnxAudioTaggingModelConfig = { zipformer: { model: ptr }, ced: ptr, num_threads: i32, debug: i32, provider: ptr }
  // SherpaOnnxAudioTaggingConfig = { model: AudioTaggingModelConfig, labels: ptr, top_k: i32 }

  function initAudioTaggingConfig(config, Module) {
    // zipformer.model string
    const zipformerModelStr = (config.model && config.model.zipformer && config.model.zipformer.model) || '';
    const zipformerModelLen = Module.lengthBytesUTF8(zipformerModelStr) + 1;
    const zipformerModelBuf = Module._malloc(zipformerModelLen);
    Module.stringToUTF8(zipformerModelStr, zipformerModelBuf, zipformerModelLen);

    // ced string
    const cedStr = (config.model && config.model.ced) || '';
    const cedLen = Module.lengthBytesUTF8(cedStr) + 1;
    const cedBuf = Module._malloc(cedLen);
    Module.stringToUTF8(cedStr, cedBuf, cedLen);

    // provider string
    const providerStr = (config.model && config.model.provider) || 'cpu';
    const providerLen = Module.lengthBytesUTF8(providerStr) + 1;
    const providerBuf = Module._malloc(providerLen);
    Module.stringToUTF8(providerStr, providerBuf, providerLen);

    // labels string
    const labelsStr = config.labels || '';
    const labelsLen = Module.lengthBytesUTF8(labelsStr) + 1;
    const labelsBuf = Module._malloc(labelsLen);
    Module.stringToUTF8(labelsStr, labelsBuf, labelsLen);

    // Build the flat struct:
    // SherpaOnnxAudioTaggingConfig =
    //   zipformer.model: ptr (4)
    //   ced: ptr (4)
    //   num_threads: i32 (4)
    //   debug: i32 (4)
    //   provider: ptr (4)
    //   labels: ptr (4)
    //   top_k: i32 (4)
    // Total = 28 bytes
    const totalLen = 7 * 4;
    const ptr = Module._malloc(totalLen);
    let offset = 0;

    Module.setValue(ptr + offset, zipformerModelBuf, 'i8*'); offset += 4; // zipformer.model
    Module.setValue(ptr + offset, cedBuf, 'i8*'); offset += 4;            // ced
    Module.setValue(ptr + offset, (config.model && config.model.numThreads) || 1, 'i32'); offset += 4;
    Module.setValue(ptr + offset, (config.model && config.model.debug) || 0, 'i32'); offset += 4;
    Module.setValue(ptr + offset, providerBuf, 'i8*'); offset += 4;       // provider
    Module.setValue(ptr + offset, labelsBuf, 'i8*'); offset += 4;         // labels
    Module.setValue(ptr + offset, config.topK || 5, 'i32'); offset += 4;  // top_k

    return {
      ptr: ptr,
      buffers: [zipformerModelBuf, cedBuf, providerBuf, labelsBuf],
    };
  }

  function freeAudioTaggingConfig(config, Module) {
    for (const buf of config.buffers) {
      Module._free(buf);
    }
    Module._free(config.ptr);
  }

  // --- AudioTagging class ---

  class AudioTagging {
    constructor(configObj, Module) {
      const config = initAudioTaggingConfig(configObj, Module);
      const handle = Module._SherpaOnnxCreateAudioTagging(config.ptr);
      freeAudioTaggingConfig(config, Module);

      if (!handle) {
        throw new Error('Failed to create audio tagging - null handle');
      }

      this.handle = handle;
      this.Module = Module;
      this.topK = configObj.topK || 5;
    }

    free() {
      if (this.handle) {
        this.Module._SherpaOnnxDestroyAudioTagging(this.handle);
        this.handle = 0;
      }
    }

    createStream() {
      const streamHandle = this.Module._SherpaOnnxAudioTaggingCreateOfflineStream(this.handle);
      if (!streamHandle) {
        throw new Error('Failed to create audio tagging offline stream');
      }
      return streamHandle;
    }

    /**
     * Feed audio samples into a stream
     * @param {number} stream - Stream handle
     * @param {number} sampleRate - Sample rate
     * @param {Float32Array} samples - Audio samples
     */
    acceptWaveform(stream, sampleRate, samples) {
      const pointer = this.Module._malloc(samples.length * samples.BYTES_PER_ELEMENT);
      this.Module.HEAPF32.set(samples, pointer / samples.BYTES_PER_ELEMENT);
      this.Module._SherpaOnnxAcceptWaveformOffline(stream, sampleRate, pointer, samples.length);
      this.Module._free(pointer);
    }

    /**
     * Compute audio tags
     * @param {number} stream - Stream handle
     * @param {number} topK - Number of top events to return (-1 for default)
     * @returns {Array<{name: string, index: number, prob: number}>}
     */
    compute(stream, topK) {
      const k = topK !== undefined ? topK : -1;
      const resultsPtr = this.Module._SherpaOnnxAudioTaggingCompute(this.handle, stream, k);

      if (!resultsPtr) {
        // Free the stream
        this.Module._SherpaOnnxDestroyOfflineStream(stream);
        return [];
      }

      const events = [];
      // resultsPtr is a pointer to an array of pointers to SherpaOnnxAudioEvent
      // Each SherpaOnnxAudioEvent = { name: ptr (4), index: i32 (4), prob: f32 (4) } = 12 bytes
      let i = 0;
      while (true) {
        const eventPtr = this.Module.HEAP32[(resultsPtr / 4) + i];
        if (!eventPtr) break; // NULL terminator

        const namePtr = this.Module.HEAP32[eventPtr / 4];
        const index = this.Module.HEAP32[eventPtr / 4 + 1];
        const prob = this.Module.HEAPF32[eventPtr / 4 + 2];

        const name = namePtr ? this.Module.UTF8ToString(namePtr) : '';
        events.push({ name, index, prob });
        i++;
      }

      this.Module._SherpaOnnxAudioTaggingFreeResults(resultsPtr);
      this.Module._SherpaOnnxDestroyOfflineStream(stream);

      return events;
    }
  }

  // --- Namespace API ---

  SherpaOnnx.AudioTagging = {
    loadModel: async function(modelConfig) {
      const debug = modelConfig.debug || false;
      const modelDir = modelConfig.modelDir || 'audio-tagging-models';

      if (debug) console.log(`AudioTagging.loadModel: dir=${modelDir}`);

      SherpaOnnx.FileSystem.removePath(modelDir, debug);

      const files = [];

      if (modelConfig.ced) {
        files.push({ url: modelConfig.ced, filename: 'model.onnx' });
      }
      if (modelConfig.labels) {
        files.push({ url: modelConfig.labels, filename: 'labels.txt' });
      }

      const result = await SherpaOnnx.FileSystem.prepareModelDirectory(files, modelDir, debug);
      if (!result.success) {
        throw new Error('Failed to load audio tagging model files');
      }

      const modelFile = result.files.find(f => f.success && f.original.filename === 'model.onnx');
      const labelsFile = result.files.find(f => f.success && f.original.filename === 'labels.txt');

      return {
        modelDir: result.modelDir,
        modelPath: modelFile ? modelFile.path : `${result.modelDir}/model.onnx`,
        labelsPath: labelsFile ? labelsFile.path : `${result.modelDir}/labels.txt`,
      };
    },

    createAudioTagging: function(loadedModel, options = {}) {
      const debug = options.debug !== undefined ? options.debug : false;
      const config = {
        model: {
          zipformer: { model: '' },
          ced: loadedModel.modelPath,
          numThreads: options.numThreads || 1,
          debug: debug ? 1 : 0,
          provider: options.provider || 'cpu',
        },
        labels: loadedModel.labelsPath,
        topK: options.topK || 5,
      };

      const tagger = new AudioTagging(config, global.Module);

      if (SherpaOnnx.trackResource) {
        SherpaOnnx.trackResource('audioTagging', tagger);
      }

      return tagger;
    },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SherpaOnnx;
  }
})(typeof window !== 'undefined' ? window : global);
