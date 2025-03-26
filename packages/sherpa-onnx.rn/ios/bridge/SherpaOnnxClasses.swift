import Foundation

// Import only CSherpaOnnx for C functions
import CSherpaOnnx

// These are declarations we need directly from the C API
// Functions to create the config objects (minimal set needed for our implementation)
func toCPointer(_ s: String) -> UnsafePointer<Int8>! {
  let cs = (s as NSString).utf8String
  return UnsafePointer<Int8>(cs)
}

func sherpaOnnxOnlineTransducerModelConfig(
  encoder: String = "",
  decoder: String = "",
  joiner: String = ""
) -> SherpaOnnxOnlineTransducerModelConfig {
  return SherpaOnnxOnlineTransducerModelConfig(
    encoder: toCPointer(encoder),
    decoder: toCPointer(decoder),
    joiner: toCPointer(joiner)
  )
}

func sherpaOnnxFeatureConfig(
  sampleRate: Int = 16000,
  featureDim: Int = 80
) -> SherpaOnnxFeatureConfig {
  return SherpaOnnxFeatureConfig(
    sample_rate: Int32(sampleRate),
    feature_dim: Int32(featureDim))
}

func sherpaOnnxOnlineModelConfig(
  tokens: String,
  transducer: SherpaOnnxOnlineTransducerModelConfig = sherpaOnnxOnlineTransducerModelConfig(),
  paraformer: SherpaOnnxOnlineParaformerModelConfig = SherpaOnnxOnlineParaformerModelConfig(),
  zipformer2Ctc: SherpaOnnxOnlineZipformer2CtcModelConfig = SherpaOnnxOnlineZipformer2CtcModelConfig(),
  numThreads: Int = 1,
  provider: String = "cpu",
  debug: Int = 0,
  modelType: String = "",
  modelingUnit: String = "cjkchar",
  bpeVocab: String = "",
  tokensBuf: String = "",
  tokensBufSize: Int = 0
) -> SherpaOnnxOnlineModelConfig {
  return SherpaOnnxOnlineModelConfig(
    transducer: transducer,
    paraformer: paraformer,
    zipformer2_ctc: zipformer2Ctc,
    tokens: toCPointer(tokens),
    num_threads: Int32(numThreads),
    provider: toCPointer(provider),
    debug: Int32(debug),
    model_type: toCPointer(modelType),
    modeling_unit: toCPointer(modelingUnit),
    bpe_vocab: toCPointer(bpeVocab),
    tokens_buf: toCPointer(tokensBuf),
    tokens_buf_size: Int32(tokensBufSize)
  )
}

func sherpaOnnxOnlineRecognizerConfig(
  featConfig: SherpaOnnxFeatureConfig,
  modelConfig: SherpaOnnxOnlineModelConfig,
  enableEndpoint: Bool = false,
  rule1MinTrailingSilence: Float = 2.4,
  rule2MinTrailingSilence: Float = 1.2,
  rule3MinUtteranceLength: Float = 30,
  decodingMethod: String = "greedy_search",
  maxActivePaths: Int = 4,
  hotwordsFile: String = "",
  hotwordsScore: Float = 1.5,
  ctcFstDecoderConfig: SherpaOnnxOnlineCtcFstDecoderConfig = SherpaOnnxOnlineCtcFstDecoderConfig(),
  ruleFsts: String = "",
  ruleFars: String = "",
  blankPenalty: Float = 0.0,
  hotwordsBuf: String = "",
  hotwordsBufSize: Int = 0
) -> SherpaOnnxOnlineRecognizerConfig {
  return SherpaOnnxOnlineRecognizerConfig(
    feat_config: featConfig,
    model_config: modelConfig,
    decoding_method: toCPointer(decodingMethod),
    max_active_paths: Int32(maxActivePaths),
    enable_endpoint: enableEndpoint ? 1 : 0,
    rule1_min_trailing_silence: rule1MinTrailingSilence,
    rule2_min_trailing_silence: rule2MinTrailingSilence,
    rule3_min_utterance_length: rule3MinUtteranceLength,
    hotwords_file: toCPointer(hotwordsFile),
    hotwords_score: hotwordsScore,
    ctc_fst_decoder_config: ctcFstDecoderConfig,
    rule_fsts: toCPointer(ruleFsts),
    rule_fars: toCPointer(ruleFars),
    blank_penalty: blankPenalty,
    hotwords_buf: toCPointer(hotwordsBuf),
    hotwords_buf_size: Int32(hotwordsBufSize)
  )
}

// Our own version of the result wrapper
@objc public class SherpaOnlineRecognitionResult: NSObject {
  private let result: UnsafePointer<SherpaOnnxOnlineRecognizerResult>!

  @objc public var text: String {
    return String(cString: result.pointee.text)
  }

  @objc public var count: Int32 {
    return result.pointee.count
  }

  init(result: UnsafePointer<SherpaOnnxOnlineRecognizerResult>!) {
    self.result = result
    super.init()
  }

  deinit {
    if let result {
      SherpaOnnxDestroyOnlineRecognizerResult(result)
    }
  }
}

// Our own implementation of the recognizer class
@objc public class SherpaOnlineRecognizer: NSObject {
  private let recognizer: OpaquePointer!
  private var stream: OpaquePointer!

  @objc public init(config: UnsafePointer<SherpaOnnxOnlineRecognizerConfig>) {
    recognizer = SherpaOnnxCreateOnlineRecognizer(config)
    stream = SherpaOnnxCreateOnlineStream(recognizer)
    super.init()
  }

  deinit {
    if let stream {
      SherpaOnnxDestroyOnlineStream(stream)
    }
    if let recognizer {
      SherpaOnnxDestroyOnlineRecognizer(recognizer)
    }
  }

  @objc public func acceptWaveform(_ samples: NSArray, sampleRate: Int = 16000) {
    let floatSamples = samples.compactMap { ($0 as? NSNumber)?.floatValue }
    SherpaOnnxOnlineStreamAcceptWaveform(stream, Int32(sampleRate), floatSamples, Int32(floatSamples.count))
  }

  @objc public func isReady() -> Bool {
    return SherpaOnnxIsOnlineStreamReady(recognizer, stream) == 1
  }

  @objc public func decode() {
    SherpaOnnxDecodeOnlineStream(recognizer, stream)
  }

  @objc public func getResult() -> SherpaOnlineRecognitionResult {
    let result = SherpaOnnxGetOnlineStreamResult(recognizer, stream)
    return SherpaOnlineRecognitionResult(result: result)
  }

  @objc public func reset(_ hotwords: String?) {
    if let words = hotwords, !words.isEmpty {
      words.withCString { cString in
        let newStream = SherpaOnnxCreateOnlineStreamWithHotwords(recognizer, cString)
        objc_sync_enter(self)
        SherpaOnnxDestroyOnlineStream(stream)
        stream = newStream
        objc_sync_exit(self)
      }
    } else {
      SherpaOnnxOnlineStreamReset(recognizer, stream)
    }
  }

  @objc public func inputFinished() {
    SherpaOnnxOnlineStreamInputFinished(stream)
  }

  @objc public func isEndpoint() -> Bool {
    return SherpaOnnxOnlineStreamIsEndpoint(recognizer, stream) == 1
  }
} 