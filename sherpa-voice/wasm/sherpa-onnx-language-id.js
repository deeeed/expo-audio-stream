/**
 * sherpa-onnx-language-id.js
 *
 * Spoken Language Identification functionality for SherpaOnnx
 * Requires sherpa-onnx-core.js to be loaded first
 */

(function(global) {
  if (!global.SherpaOnnx) {
    console.error('SherpaOnnx namespace not found. Make sure to load sherpa-onnx-core.js first.');
    return;
  }

  const SherpaOnnx = global.SherpaOnnx;

  // --- WASM struct init helpers ---

  // SherpaOnnxSpokenLanguageIdentificationWhisperConfig = { encoder: ptr, decoder: ptr, tail_paddings: i32 }
  // SherpaOnnxSpokenLanguageIdentificationConfig = { whisper: WhisperConfig, num_threads: i32, debug: i32, provider: ptr }

  function initLanguageIdConfig(config, Module) {
    // whisper.encoder
    const encoderStr = (config.whisper && config.whisper.encoder) || '';
    const encoderLen = Module.lengthBytesUTF8(encoderStr) + 1;
    const encoderBuf = Module._malloc(encoderLen);
    Module.stringToUTF8(encoderStr, encoderBuf, encoderLen);

    // whisper.decoder
    const decoderStr = (config.whisper && config.whisper.decoder) || '';
    const decoderLen = Module.lengthBytesUTF8(decoderStr) + 1;
    const decoderBuf = Module._malloc(decoderLen);
    Module.stringToUTF8(decoderStr, decoderBuf, decoderLen);

    // provider
    const providerStr = config.provider || 'cpu';
    const providerLen = Module.lengthBytesUTF8(providerStr) + 1;
    const providerBuf = Module._malloc(providerLen);
    Module.stringToUTF8(providerStr, providerBuf, providerLen);

    // Flat struct layout:
    // encoder: ptr (4)
    // decoder: ptr (4)
    // tail_paddings: i32 (4)
    // num_threads: i32 (4)
    // debug: i32 (4)
    // provider: ptr (4)
    // Total = 24 bytes
    const totalLen = 6 * 4;
    const ptr = Module._malloc(totalLen);
    let offset = 0;

    Module.setValue(ptr + offset, encoderBuf, 'i8*'); offset += 4;
    Module.setValue(ptr + offset, decoderBuf, 'i8*'); offset += 4;
    Module.setValue(ptr + offset, (config.whisper && config.whisper.tailPaddings) || -1, 'i32'); offset += 4;
    Module.setValue(ptr + offset, config.numThreads || 1, 'i32'); offset += 4;
    Module.setValue(ptr + offset, config.debug || 0, 'i32'); offset += 4;
    Module.setValue(ptr + offset, providerBuf, 'i8*'); offset += 4;

    return {
      ptr: ptr,
      buffers: [encoderBuf, decoderBuf, providerBuf],
    };
  }

  function freeLanguageIdConfig(config, Module) {
    for (const buf of config.buffers) {
      Module._free(buf);
    }
    Module._free(config.ptr);
  }

  // --- SpokenLanguageIdentification class ---

  class SpokenLanguageIdentification {
    constructor(configObj, Module) {
      const config = initLanguageIdConfig(configObj, Module);
      const handle = Module._SherpaOnnxCreateSpokenLanguageIdentification(config.ptr);
      freeLanguageIdConfig(config, Module);

      if (!handle) {
        throw new Error('Failed to create spoken language identification - null handle');
      }

      this.handle = handle;
      this.Module = Module;
    }

    free() {
      if (this.handle) {
        this.Module._SherpaOnnxDestroySpokenLanguageIdentification(this.handle);
        this.handle = 0;
      }
    }

    createStream() {
      const streamHandle = this.Module._SherpaOnnxSpokenLanguageIdentificationCreateOfflineStream(this.handle);
      if (!streamHandle) {
        throw new Error('Failed to create language ID offline stream');
      }
      return streamHandle;
    }

    /**
     * Feed audio samples into a stream
     */
    acceptWaveform(stream, sampleRate, samples) {
      const pointer = this.Module._malloc(samples.length * samples.BYTES_PER_ELEMENT);
      this.Module.HEAPF32.set(samples, pointer / samples.BYTES_PER_ELEMENT);
      this.Module._SherpaOnnxAcceptWaveformOffline(stream, sampleRate, pointer, samples.length);
      this.Module._free(pointer);
    }

    /**
     * Compute the language
     * @param {number} stream - Stream handle
     * @returns {string} - Language code (e.g. 'en', 'de', 'zh')
     */
    compute(stream) {
      const resultPtr = this.Module._SherpaOnnxSpokenLanguageIdentificationCompute(this.handle, stream);

      if (!resultPtr) {
        this.Module._SherpaOnnxDestroyOfflineStream(stream);
        return '';
      }

      // SherpaOnnxSpokenLanguageIdentificationResult = { lang: ptr }
      const langPtr = this.Module.HEAP32[resultPtr / 4];
      const lang = langPtr ? this.Module.UTF8ToString(langPtr) : '';

      this.Module._SherpaOnnxDestroySpokenLanguageIdentificationResult(resultPtr);
      this.Module._SherpaOnnxDestroyOfflineStream(stream);

      return lang;
    }
  }

  // --- Namespace API ---

  SherpaOnnx.LanguageId = {
    loadModel: async function(modelConfig) {
      const debug = modelConfig.debug || false;
      const modelDir = modelConfig.modelDir || 'language-id-models';

      if (debug) console.log(`LanguageId.loadModel: dir=${modelDir}`);

      SherpaOnnx.FileSystem.removePath(modelDir, debug);

      const files = [
        { url: modelConfig.encoder || 'assets/language-id/tiny-encoder.onnx', filename: 'tiny-encoder.onnx' },
        { url: modelConfig.decoder || 'assets/language-id/tiny-decoder.onnx', filename: 'tiny-decoder.onnx' },
      ];

      const result = await SherpaOnnx.FileSystem.prepareModelDirectory(files, modelDir, debug);
      if (!result.success) {
        throw new Error('Failed to load language ID model files');
      }

      const encoderFile = result.files.find(f => f.success && f.original.filename === 'tiny-encoder.onnx');
      const decoderFile = result.files.find(f => f.success && f.original.filename === 'tiny-decoder.onnx');

      return {
        modelDir: result.modelDir,
        encoderPath: encoderFile ? encoderFile.path : `${result.modelDir}/tiny-encoder.onnx`,
        decoderPath: decoderFile ? decoderFile.path : `${result.modelDir}/tiny-decoder.onnx`,
      };
    },

    createLanguageId: function(loadedModel, options = {}) {
      const debug = options.debug !== undefined ? options.debug : false;
      const config = {
        whisper: {
          encoder: loadedModel.encoderPath,
          decoder: loadedModel.decoderPath,
          tailPaddings: options.tailPaddings || -1,
        },
        numThreads: options.numThreads || 1,
        debug: debug ? 1 : 0,
        provider: options.provider || 'cpu',
      };

      const lid = new SpokenLanguageIdentification(config, global.Module);

      if (SherpaOnnx.trackResource) {
        SherpaOnnx.trackResource('languageId', lid);
      }

      return lid;
    },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SherpaOnnx;
  }
})(typeof window !== 'undefined' ? window : global);
