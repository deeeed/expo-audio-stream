/**
 * sherpa-onnx-punctuation.js
 *
 * Online/Offline Punctuation functionality for SherpaOnnx
 * Requires sherpa-onnx-core.js to be loaded first
 */

(function(global) {
  if (!global.SherpaOnnx) {
    console.error('SherpaOnnx namespace not found. Make sure to load sherpa-onnx-core.js first.');
    return;
  }

  const SherpaOnnx = global.SherpaOnnx;

  // --- OnlinePunctuation ---
  // SherpaOnnxOnlinePunctuationModelConfig = { cnn_bilstm: ptr, bpe_vocab: ptr, num_threads: i32, debug: i32, provider: ptr }
  // SherpaOnnxOnlinePunctuationConfig = { model: OnlinePunctuationModelConfig }

  class OnlinePunctuation {
    constructor(configObj, Module) {
      const cnnBilstmStr = (configObj.model && configObj.model.cnnBilstm) || '';
      const bpeVocabStr = (configObj.model && configObj.model.bpeVocab) || '';
      const providerStr = (configObj.model && configObj.model.provider) || 'cpu';

      const cnnLen = Module.lengthBytesUTF8(cnnBilstmStr) + 1;
      const bpeLen = Module.lengthBytesUTF8(bpeVocabStr) + 1;
      const provLen = Module.lengthBytesUTF8(providerStr) + 1;

      const strBuf = Module._malloc(cnnLen + bpeLen + provLen);
      let strOff = 0;
      Module.stringToUTF8(cnnBilstmStr, strBuf + strOff, cnnLen); strOff += cnnLen;
      Module.stringToUTF8(bpeVocabStr, strBuf + strOff, bpeLen); strOff += bpeLen;
      Module.stringToUTF8(providerStr, strBuf + strOff, provLen);

      // Flat struct layout:
      // cnn_bilstm: ptr (4)
      // bpe_vocab: ptr (4)
      // num_threads: i32 (4)
      // debug: i32 (4)
      // provider: ptr (4)
      // Total = 20 bytes
      const ptr = Module._malloc(20);
      let offset = 0;
      Module.setValue(ptr + offset, strBuf, 'i8*'); offset += 4;
      Module.setValue(ptr + offset, strBuf + cnnLen, 'i8*'); offset += 4;
      Module.setValue(ptr + offset, (configObj.model && configObj.model.numThreads) || 1, 'i32'); offset += 4;
      Module.setValue(ptr + offset, (configObj.model && configObj.model.debug) || 0, 'i32'); offset += 4;
      Module.setValue(ptr + offset, strBuf + cnnLen + bpeLen, 'i8*'); offset += 4;

      const handle = Module._SherpaOnnxCreateOnlinePunctuation(ptr);
      Module._free(strBuf);
      Module._free(ptr);

      if (!handle) {
        throw new Error('Failed to create online punctuation - null handle');
      }

      this.handle = handle;
      this.Module = Module;
    }

    free() {
      if (this.handle) {
        this.Module._SherpaOnnxDestroyOnlinePunctuation(this.handle);
        this.handle = 0;
      }
    }

    /**
     * Add punctuation to input text
     * @param {string} text - Input text without punctuation
     * @returns {string} - Text with punctuation added
     */
    addPunct(text) {
      const textLen = this.Module.lengthBytesUTF8(text) + 1;
      const textPtr = this.Module._malloc(textLen);
      this.Module.stringToUTF8(text, textPtr, textLen);

      const resultPtr = this.Module._SherpaOnnxOnlinePunctuationAddPunct(this.handle, textPtr);
      this.Module._free(textPtr);

      if (!resultPtr) return text;

      const result = this.Module.UTF8ToString(resultPtr);
      this.Module._SherpaOnnxOnlinePunctuationFreeText(resultPtr);
      return result;
    }
  }

  // --- Namespace API ---

  SherpaOnnx.Punctuation = {
    loadModel: async function(modelConfig) {
      const debug = modelConfig.debug || false;
      const modelDir = modelConfig.modelDir || 'punctuation-models';

      if (debug) console.log(`Punctuation.loadModel: dir=${modelDir}`);

      SherpaOnnx.FileSystem.removePath(modelDir, debug);

      const files = [];
      if (modelConfig.cnnBilstm) {
        files.push({ url: modelConfig.cnnBilstm, filename: 'model.onnx' });
      }
      if (modelConfig.bpeVocab) {
        files.push({ url: modelConfig.bpeVocab, filename: 'bpe.vocab' });
      }

      const result = await SherpaOnnx.FileSystem.prepareModelDirectory(files, modelDir, debug);
      if (!result.success) {
        throw new Error('Failed to load punctuation model files');
      }

      const modelFile = result.files.find(f => f.success && f.original.filename === 'model.onnx');
      const vocabFile = result.files.find(f => f.success && f.original.filename === 'bpe.vocab');

      return {
        modelDir: result.modelDir,
        modelPath: modelFile ? modelFile.path : `${result.modelDir}/model.onnx`,
        vocabPath: vocabFile ? vocabFile.path : `${result.modelDir}/bpe.vocab`,
      };
    },

    createPunctuation: function(loadedModel, options = {}) {
      const debug = options.debug !== undefined ? options.debug : false;
      const config = {
        model: {
          cnnBilstm: loadedModel.modelPath,
          bpeVocab: loadedModel.vocabPath,
          numThreads: options.numThreads || 1,
          debug: debug ? 1 : 0,
          provider: options.provider || 'cpu',
        },
      };

      const punct = new OnlinePunctuation(config, global.Module);

      if (SherpaOnnx.trackResource) {
        SherpaOnnx.trackResource('punctuation', punct);
      }

      return punct;
    },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SherpaOnnx;
  }
})(typeof window !== 'undefined' ? window : global);
