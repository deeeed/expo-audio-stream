#import "Essentia.h"
#import <React/RCTLog.h>
// Import your C++ wrapper
#import "../cpp/EssentiaWrapper.h"
#import "../cpp/FeatureExtractor.h"

@implementation Essentia {
  EssentiaWrapper* _wrapper;
  FeatureExtractor* _featureExtractor;
}

RCT_EXPORT_MODULE()

- (instancetype)init {
  if (self = [super init]) {
    _wrapper = new EssentiaWrapper();
    _featureExtractor = new FeatureExtractor(_wrapper);
  }
  return self;
}

- (void)dealloc {
  delete _featureExtractor;
  delete _wrapper;
}

// Make sure main queue setup is async
+ (BOOL)requiresMainQueueSetup {
  return NO;
}

#pragma mark - Core functionality

RCT_EXPORT_METHOD(initialize:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  bool success = _wrapper->initialize();
  if (success) {
    resolve(@YES);
  } else {
    reject(@"init_failed", @"Failed to initialize Essentia", nil);
  }
}

RCT_EXPORT_METHOD(setAudioData:(NSArray *)audioData
                  sampleRate:(double)sampleRate
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  // Convert JS array to C++ vector
  std::vector<float> buffer;
  buffer.reserve([audioData count]);

  for (id item in audioData) {
    if ([item isKindOfClass:[NSNumber class]]) {
      buffer.push_back([item floatValue]);
    }
  }

  bool success = _wrapper->setAudioData(buffer, sampleRate);
  if (success) {
    resolve(@YES);
  } else {
    reject(@"set_audio_failed", @"Failed to set audio data", nil);
  }
}

RCT_EXPORT_METHOD(executeAlgorithm:(NSString *)algorithm
                  params:(NSDictionary *)params
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  // Convert params dictionary to JSON string
  NSError *error;
  NSData *jsonData = [NSJSONSerialization dataWithJSONObject:params options:0 error:&error];

  if (error) {
    reject(@"json_error", @"Failed to serialize parameters", error);
    return;
  }

  NSString *paramsJson = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
  std::string result = _wrapper->executeAlgorithm([algorithm UTF8String], [paramsJson UTF8String]);

  resolve([NSString stringWithUTF8String:result.c_str()]);
}

#pragma mark - Algorithm information methods

RCT_EXPORT_METHOD(getAlgorithmInfo:(NSString *)algorithm
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  std::string result = _wrapper->getAlgorithmInfo([algorithm UTF8String]);
  resolve([NSString stringWithUTF8String:result.c_str()]);
}

RCT_EXPORT_METHOD(getAllAlgorithms:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  std::string result = _wrapper->getAllAlgorithms();
  resolve([NSString stringWithUTF8String:result.c_str()]);
}

#pragma mark - Feature extraction methods

RCT_EXPORT_METHOD(extractFeatures:(NSArray *)features
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  // Convert features array to JSON string
  NSError *error;
  NSData *jsonData = [NSJSONSerialization dataWithJSONObject:features options:0 error:&error];

  if (error) {
    reject(@"json_error", @"Failed to serialize features", error);
    return;
  }

  NSString *featuresJson = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
  std::string result = _featureExtractor->extractFeatures([featuresJson UTF8String]);

  resolve([NSString stringWithUTF8String:result.c_str()]);
}

RCT_EXPORT_METHOD(computeMelSpectrogram:(nonnull NSNumber *)frameSize
                  hopSize:(nonnull NSNumber *)hopSize
                  nMels:(nonnull NSNumber *)nMels
                  fMin:(nonnull NSNumber *)fMin
                  fMax:(nonnull NSNumber *)fMax
                  windowType:(NSString *)windowType
                  normalize:(nonnull NSNumber *)normalize
                  logScale:(nonnull NSNumber *)logScale
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  std::string result = _featureExtractor->computeMelSpectrogram(
    [frameSize intValue],
    [hopSize intValue],
    [nMels intValue],
    [fMin floatValue],
    [fMax floatValue],
    [windowType UTF8String],
    [normalize boolValue],
    [logScale boolValue]
  );

  resolve([NSString stringWithUTF8String:result.c_str()]);
}

RCT_EXPORT_METHOD(executePipeline:(NSDictionary *)pipelineConfig
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  // Convert pipeline config to JSON string
  NSError *error;
  NSData *jsonData = [NSJSONSerialization dataWithJSONObject:pipelineConfig options:0 error:&error];

  if (error) {
    reject(@"json_error", @"Failed to serialize pipeline config", error);
    return;
  }

  NSString *pipelineJson = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
  std::string result = _featureExtractor->executePipeline([pipelineJson UTF8String]);

  resolve([NSString stringWithUTF8String:result.c_str()]);
}

RCT_EXPORT_METHOD(computeSpectrum:(nonnull NSNumber *)frameSize
                  hopSize:(nonnull NSNumber *)hopSize
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  _wrapper->computeSpectrum([frameSize intValue], [hopSize intValue]);
  resolve(@(_wrapper->getSpectrumComputed()));
}

RCT_EXPORT_METHOD(computeTonnetz:(NSArray *)hpcp
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  // Convert hpcp array to JSON string
  NSError *error;
  NSData *jsonData = [NSJSONSerialization dataWithJSONObject:hpcp options:0 error:&error];

  if (error) {
    reject(@"json_error", @"Failed to serialize HPCP data", error);
    return;
  }

  NSString *hpcpJson = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
  std::string result = _featureExtractor->computeTonnetz([hpcpJson UTF8String]);

  resolve([NSString stringWithUTF8String:result.c_str()]);
}

RCT_EXPORT_METHOD(testJniConnection:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
  resolve(@"JNI connection successful (iOS)");
}

RCT_EXPORT_METHOD(getVersion:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  // Access version from Essentia
  resolve(@(ESSENTIA_VERSION));
}

// Add more convenience methods to match your Android implementation

@end
