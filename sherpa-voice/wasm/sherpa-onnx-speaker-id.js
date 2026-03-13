/**
 * sherpa-onnx-speaker-id.js
 *
 * Speaker Embedding Extraction and Management for SherpaOnnx
 * Requires sherpa-onnx-core.js to be loaded first
 */

(function(global) {
  if (!global.SherpaOnnx) {
    console.error('SherpaOnnx namespace not found. Make sure to load sherpa-onnx-core.js first.');
    return;
  }

  const SherpaOnnx = global.SherpaOnnx;

  // --- SpeakerEmbeddingExtractor ---
  // SherpaOnnxSpeakerEmbeddingExtractorConfig = { model: ptr, num_threads: i32, debug: i32, provider: ptr }
  // Same layout as used in sherpa-onnx-speaker.js initSherpaOnnxSpeakerEmbeddingExtractorConfig

  class SpeakerEmbeddingExtractor {
    constructor(configObj, Module) {
      const modelStr = configObj.model || '';
      const providerStr = configObj.provider || 'cpu';

      const modelLen = Module.lengthBytesUTF8(modelStr) + 1;
      const providerLen = Module.lengthBytesUTF8(providerStr) + 1;
      const strBuf = Module._malloc(modelLen + providerLen);

      Module.stringToUTF8(modelStr, strBuf, modelLen);
      Module.stringToUTF8(providerStr, strBuf + modelLen, providerLen);

      // Struct: { model: ptr, num_threads: i32, debug: i32, provider: ptr } = 16 bytes
      const ptr = Module._malloc(16);
      let offset = 0;
      Module.setValue(ptr + offset, strBuf, 'i8*'); offset += 4;
      Module.setValue(ptr + offset, configObj.numThreads || 1, 'i32'); offset += 4;
      Module.setValue(ptr + offset, configObj.debug || 0, 'i32'); offset += 4;
      Module.setValue(ptr + offset, strBuf + modelLen, 'i8*'); offset += 4;

      const handle = Module._SherpaOnnxCreateSpeakerEmbeddingExtractor(ptr);
      Module._free(strBuf);
      Module._free(ptr);

      if (!handle) {
        throw new Error('Failed to create speaker embedding extractor - null handle');
      }

      this.handle = handle;
      this.Module = Module;
      this._dim = Module._SherpaOnnxSpeakerEmbeddingExtractorDim(handle);
    }

    dim() { return this._dim; }

    free() {
      if (this.handle) {
        this.Module._SherpaOnnxDestroySpeakerEmbeddingExtractor(this.handle);
        this.handle = 0;
      }
    }

    createStream() {
      const streamHandle = this.Module._SherpaOnnxSpeakerEmbeddingExtractorCreateStream(this.handle);
      if (!streamHandle) {
        throw new Error('Failed to create speaker embedding extractor stream');
      }
      return streamHandle;
    }

    /**
     * Feed audio samples. Uses OnlineStream API (SherpaOnnxOnlineStreamAcceptWaveform).
     */
    acceptWaveform(stream, sampleRate, samples) {
      const pointer = this.Module._malloc(samples.length * samples.BYTES_PER_ELEMENT);
      this.Module.HEAPF32.set(samples, pointer / samples.BYTES_PER_ELEMENT);
      this.Module._SherpaOnnxOnlineStreamAcceptWaveform(stream, sampleRate, pointer, samples.length);
      this.Module._free(pointer);
    }

    inputFinished(stream) {
      this.Module._SherpaOnnxOnlineStreamInputFinished(stream);
    }

    isReady(stream) {
      return this.Module._SherpaOnnxSpeakerEmbeddingExtractorIsReady(this.handle, stream) !== 0;
    }

    /**
     * Compute speaker embedding
     * @param {number} stream - OnlineStream handle
     * @returns {Float32Array} - Embedding vector
     */
    computeEmbedding(stream) {
      const embPtr = this.Module._SherpaOnnxSpeakerEmbeddingExtractorComputeEmbedding(this.handle, stream);
      if (!embPtr) {
        return new Float32Array(0);
      }

      const dim = this._dim;
      const embedding = new Float32Array(dim);
      for (let i = 0; i < dim; i++) {
        embedding[i] = this.Module.HEAPF32[embPtr / 4 + i];
      }

      this.Module._SherpaOnnxSpeakerEmbeddingExtractorDestroyEmbedding(embPtr);
      return embedding;
    }

    destroyStream(stream) {
      if (stream) {
        this.Module._SherpaOnnxDestroyOnlineStream(stream);
      }
    }
  }

  // --- SpeakerEmbeddingManager ---

  class SpeakerEmbeddingManager {
    constructor(dim, Module) {
      const handle = Module._SherpaOnnxCreateSpeakerEmbeddingManager(dim);
      if (!handle) {
        throw new Error('Failed to create speaker embedding manager');
      }
      this.handle = handle;
      this.Module = Module;
      this._dim = dim;
    }

    free() {
      if (this.handle) {
        this.Module._SherpaOnnxDestroySpeakerEmbeddingManager(this.handle);
        this.handle = 0;
      }
    }

    _allocateEmbedding(embedding) {
      const ptr = this.Module._malloc(embedding.length * 4);
      this.Module.HEAPF32.set(embedding, ptr / 4);
      return ptr;
    }

    add(name, embedding) {
      const nameLen = this.Module.lengthBytesUTF8(name) + 1;
      const namePtr = this.Module._malloc(nameLen);
      this.Module.stringToUTF8(name, namePtr, nameLen);

      const embPtr = this._allocateEmbedding(embedding);
      const result = this.Module._SherpaOnnxSpeakerEmbeddingManagerAdd(this.handle, namePtr, embPtr);

      this.Module._free(namePtr);
      this.Module._free(embPtr);
      return result !== 0;
    }

    remove(name) {
      const nameLen = this.Module.lengthBytesUTF8(name) + 1;
      const namePtr = this.Module._malloc(nameLen);
      this.Module.stringToUTF8(name, namePtr, nameLen);

      const result = this.Module._SherpaOnnxSpeakerEmbeddingManagerRemove(this.handle, namePtr);
      this.Module._free(namePtr);
      return result !== 0;
    }

    search(embedding, threshold) {
      const embPtr = this._allocateEmbedding(embedding);
      const resultPtr = this.Module._SherpaOnnxSpeakerEmbeddingManagerSearch(this.handle, embPtr, threshold);
      this.Module._free(embPtr);

      if (!resultPtr) return '';
      const name = this.Module.UTF8ToString(resultPtr);
      this.Module._SherpaOnnxSpeakerEmbeddingManagerFreeSearch(resultPtr);
      return name;
    }

    verify(name, embedding, threshold) {
      const nameLen = this.Module.lengthBytesUTF8(name) + 1;
      const namePtr = this.Module._malloc(nameLen);
      this.Module.stringToUTF8(name, namePtr, nameLen);

      const embPtr = this._allocateEmbedding(embedding);
      const result = this.Module._SherpaOnnxSpeakerEmbeddingManagerVerify(this.handle, namePtr, embPtr, threshold);

      this.Module._free(namePtr);
      this.Module._free(embPtr);
      return result !== 0;
    }

    contains(name) {
      const nameLen = this.Module.lengthBytesUTF8(name) + 1;
      const namePtr = this.Module._malloc(nameLen);
      this.Module.stringToUTF8(name, namePtr, nameLen);

      const result = this.Module._SherpaOnnxSpeakerEmbeddingManagerContains(this.handle, namePtr);
      this.Module._free(namePtr);
      return result !== 0;
    }

    numSpeakers() {
      return this.Module._SherpaOnnxSpeakerEmbeddingManagerNumSpeakers(this.handle);
    }

    getAllSpeakers() {
      const namesPtr = this.Module._SherpaOnnxSpeakerEmbeddingManagerGetAllSpeakers(this.handle);
      if (!namesPtr) return [];

      const speakers = [];
      let i = 0;
      while (true) {
        const namePtr = this.Module.HEAP32[(namesPtr / 4) + i];
        if (!namePtr) break;
        speakers.push(this.Module.UTF8ToString(namePtr));
        i++;
      }

      this.Module._SherpaOnnxSpeakerEmbeddingManagerFreeAllSpeakers(namesPtr);
      return speakers;
    }
  }

  // --- Namespace API ---

  SherpaOnnx.SpeakerId = {
    loadModel: async function(modelConfig) {
      const debug = modelConfig.debug || false;
      const modelDir = modelConfig.modelDir || 'speaker-id-models';

      if (debug) console.log(`SpeakerId.loadModel: dir=${modelDir}`);

      SherpaOnnx.FileSystem.removePath(modelDir, debug);

      const files = [{
        url: modelConfig.model || 'assets/speaker-id/model.onnx',
        filename: 'model.onnx',
      }];

      const result = await SherpaOnnx.FileSystem.prepareModelDirectory(files, modelDir, debug);
      if (!result.success) {
        throw new Error('Failed to load speaker ID model files');
      }

      const modelFile = result.files.find(f => f.success && f.original.filename === 'model.onnx');

      return {
        modelDir: result.modelDir,
        modelPath: modelFile ? modelFile.path : `${result.modelDir}/model.onnx`,
      };
    },

    createExtractor: function(loadedModel, options = {}) {
      const debug = options.debug !== undefined ? options.debug : false;
      const extractor = new SpeakerEmbeddingExtractor({
        model: loadedModel.modelPath,
        numThreads: options.numThreads || 1,
        debug: debug ? 1 : 0,
        provider: options.provider || 'cpu',
      }, global.Module);

      if (SherpaOnnx.trackResource) {
        SherpaOnnx.trackResource('speakerId', extractor);
      }

      return extractor;
    },

    createManager: function(dim) {
      const manager = new SpeakerEmbeddingManager(dim, global.Module);

      if (SherpaOnnx.trackResource) {
        SherpaOnnx.trackResource('speakerId', manager);
      }

      return manager;
    },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SherpaOnnx;
  }
})(typeof window !== 'undefined' ? window : global);
