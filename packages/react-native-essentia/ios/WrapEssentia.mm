// packages/react-native-essentia/ios/Essentia.mm
#ifdef __cplusplus
#include "../cpp/EssentiaWrapper.h"
#include "../cpp/FeatureExtractor.h"
#endif

#import "WrapEssentia.h"
#import <React/RCTLog.h>
// Import your C++ wrapper - use proper bridging with Objective-C++
#include <vector>
#include <string>

// Forward declare C++ classes to avoid exposing C++ headers directly to Objective-C
class EssentiaWrapper;
// class FeatureExtractor;

@implementation Essentia {
  EssentiaWrapper* _wrapper;
  FeatureExtractor* _featureExtractor;
  BOOL _isInitialized; // Track initialization state

  // Add caching variables
  NSMutableDictionary* _algorithmInfoCache;
  NSDictionary* _allAlgorithmsCache;
  BOOL _isCacheEnabled;

  // Add thread pool variables
  dispatch_queue_t _workerQueue;
  NSInteger _threadCount;
}

RCT_EXPORT_MODULE()

- (instancetype)init {
  RCTLogInfo(@"[Essentia] Initializing module");
  if (self = [super init]) {
    _isInitialized = NO; // Initially not initialized

    // Initialize caching system
    _algorithmInfoCache = [NSMutableDictionary dictionary];
    _allAlgorithmsCache = nil;
    _isCacheEnabled = YES;

    // Initialize thread pool
    _threadCount = 4; // Default thread count
    _workerQueue = dispatch_queue_create("net.siteed.essentia.worker", DISPATCH_QUEUE_CONCURRENT);

    RCTLogInfo(@"[Essentia] Module initialized, lazy initialization will be used");
  }
  return self;
}

- (void)dealloc {
  RCTLogInfo(@"[Essentia] Deallocating module, isInitialized: %@", _isInitialized ? @"YES" : @"NO");

  // Clear caches
  [self clearCache];

  // Clean up C++ resources
  if (_isInitialized) {
    RCTLogInfo(@"[Essentia] Cleaning up native resources");
    if (_featureExtractor) {
      delete _featureExtractor;
      _featureExtractor = nullptr;
    }
    if (_wrapper) {
      delete _wrapper;
      _wrapper = nullptr;
    }
    _isInitialized = NO;
  }

  // No need to explicitly release _workerQueue as ARC will handle it
}

// Make sure main queue setup is async
+ (BOOL)requiresMainQueueSetup {
  return NO;
}

#pragma mark - Core functionality

// Ensure initialization happens lazily
- (void)ensureInitializedWithResolver:(RCTPromiseResolveBlock)resolve
                             rejecter:(RCTPromiseRejectBlock)reject {
  RCTLogInfo(@"[Essentia] Ensuring initialization (current state: %@)", _isInitialized ? @"initialized" : @"not initialized");

  dispatch_async(_workerQueue, ^{
    @synchronized(self) {
      if (!self->_isInitialized) {
        RCTLogInfo(@"[Essentia] Creating new EssentiaWrapper instance");
        self->_wrapper = new EssentiaWrapper();

        RCTLogInfo(@"[Essentia] Initializing EssentiaWrapper");
        bool success = self->_wrapper->initialize();

        if (!success) {
          RCTLogError(@"[Essentia] Failed to initialize EssentiaWrapper");
          delete self->_wrapper;
          self->_wrapper = nullptr;
          dispatch_async(dispatch_get_main_queue(), ^{
            reject(@"init_failed", @"Failed to initialize Essentia wrapper", nil);
          });
          return;
        }

        RCTLogInfo(@"[Essentia] Creating FeatureExtractor");
        self->_featureExtractor = new FeatureExtractor(self->_wrapper);
        self->_isInitialized = YES;
        RCTLogInfo(@"[Essentia] Initialization completed successfully");
      }

      dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@YES);
      });
    }
  });
}

RCT_EXPORT_METHOD(initialize:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"[Essentia] Explicit initialize method called");
  [self ensureInitializedWithResolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(setAudioData:(NSArray *)audioData
                  sampleRate:(nonnull NSNumber *)sampleRate
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"[Essentia] setAudioData called with %lu samples at sample rate %@",
             (unsigned long)[audioData count], sampleRate);

  [self ensureInitializedWithResolver:^(id initResult) {
    // Convert JS array to C++ vector
    RCTLogInfo(@"[Essentia] Converting audio data to C++ vector");
    std::vector<float> buffer;
    buffer.reserve([audioData count]);

    for (id item in audioData) {
      if ([item isKindOfClass:[NSNumber class]]) {
        buffer.push_back([item floatValue]);
      }
    }

    RCTLogInfo(@"[Essentia] Setting audio data in native layer (%lu samples)", (unsigned long)buffer.size());
    bool success = self->_wrapper->setAudioData(buffer, [sampleRate doubleValue]);

    if (success) {
      RCTLogInfo(@"[Essentia] Successfully set audio data");
      resolve(@YES);
    } else {
      RCTLogError(@"[Essentia] Failed to set audio data");
      reject(@"set_audio_failed", @"Failed to set audio data", nil);
    }
  } rejecter:reject];
}

RCT_EXPORT_METHOD(executeAlgorithm:(NSString *)algorithm
                  params:(NSDictionary *)params
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"[Essentia] executeAlgorithm called with algorithm: %@", algorithm);

  // Validate inputs
  if ([algorithm length] == 0) {
    reject(@"ESSENTIA_INVALID_INPUT", @"Algorithm name cannot be empty", nil);
    return;
  }

  [self ensureInitializedWithResolver:^(id initResult) {
    // Convert params dictionary to JSON string
    NSError *error;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:params options:0 error:&error];

    if (error) {
      RCTLogError(@"[Essentia] Failed to serialize parameters: %@", error);
      reject(@"json_error", @"Failed to serialize parameters", error);
      return;
    }

    NSString *paramsJson = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    RCTLogInfo(@"[Essentia] Executing algorithm %@ with params: %@", algorithm, paramsJson);

    std::string algResult = self->_wrapper->executeAlgorithm([algorithm UTF8String], [paramsJson UTF8String]);
    RCTLogInfo(@"[Essentia] Algorithm %@ execution completed", algorithm);

    // Parse the JSON string to an object before resolving
    NSString *jsonString = [NSString stringWithUTF8String:algResult.c_str()];
    id resultMap = [self parseJSONString:jsonString];

    // Check for errors using our new helper
    if ([self handleErrorInResultMap:resultMap promise:resolve rejecter:reject]) {
      return;
    }

    // Check for data field for consistent resolution
    if ([resultMap isKindOfClass:[NSDictionary class]] &&
        [(NSDictionary *)resultMap objectForKey:@"data"]) {
      resolve(resultMap);
    } else {
      // Still resolve with resultMap for backward compatibility, but log a warning
      RCTLogWarn(@"[Essentia] Algorithm %@ returned success but no data field", algorithm);
      resolve(resultMap);
    }
  } rejecter:reject];
}

#pragma mark - Algorithm information methods

// Add this helper method for JSON parsing
- (id)parseJSONString:(NSString *)jsonString {
  if (jsonString == nil || [jsonString length] == 0) {
    NSMutableDictionary *errorDict = [NSMutableDictionary dictionary];
    [errorDict setObject:@(NO) forKey:@"success"];
    [errorDict setObject:@"Native layer returned null or empty result" forKey:@"error"];
    return errorDict;
  }

  NSData *jsonData = [jsonString dataUsingEncoding:NSUTF8StringEncoding];
  NSError *error;
  id result = [NSJSONSerialization JSONObjectWithData:jsonData options:0 error:&error];

  if (error || !result) {
    RCTLogError(@"[Essentia] Error parsing JSON: %@", error);

    // Return a structured error object if parsing fails
    NSMutableDictionary *errorDict = [NSMutableDictionary dictionary];
    [errorDict setObject:@(NO) forKey:@"success"];

    NSMutableDictionary *errorInfo = [NSMutableDictionary dictionary];
    [errorInfo setObject:@"JSON_PARSING_ERROR" forKey:@"code"];
    [errorInfo setObject:[NSString stringWithFormat:@"Failed to parse JSON result: %@", error.localizedDescription] forKey:@"message"];

    [errorDict setObject:errorInfo forKey:@"error"];
    return errorDict;
  }

  return result;
}

RCT_EXPORT_METHOD(getAlgorithmInfo:(NSString *)algorithm
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"[Essentia] getAlgorithmInfo called for algorithm: %@", algorithm);

  // Validate inputs
  if ([algorithm length] == 0) {
    reject(@"ESSENTIA_INVALID_INPUT", @"Algorithm name cannot be empty", nil);
    return;
  }

  // Check cache first if enabled
  if (_isCacheEnabled) {
    @synchronized(self) {
      id cachedInfo = _algorithmInfoCache[algorithm];
      if (cachedInfo) {
        RCTLogInfo(@"[Essentia] Returning cached algorithm info for %@", algorithm);
        resolve(cachedInfo);
        return;
      }
    }
  }

  [self ensureInitializedWithResolver:^(id initResult) {
    RCTLogInfo(@"[Essentia] Retrieving algorithm info for %@", algorithm);
    std::string algResult = self->_wrapper->getAlgorithmInfo([algorithm UTF8String]);
    RCTLogInfo(@"[Essentia] Successfully retrieved info for algorithm %@", algorithm);

    // Parse the JSON string to an object before resolving
    NSString *jsonString = [NSString stringWithUTF8String:algResult.c_str()];
    id result = [self parseJSONString:jsonString];

    // Cache the result if caching is enabled
    if (self->_isCacheEnabled) {
      @synchronized(self) {
        self->_algorithmInfoCache[algorithm] = result;
      }
    }

    resolve(result);
  } rejecter:reject];
}

RCT_EXPORT_METHOD(getAllAlgorithms:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"[Essentia] getAllAlgorithms called");

  // Check cache first if enabled
  if (_isCacheEnabled && _allAlgorithmsCache) {
    RCTLogInfo(@"[Essentia] Returning cached algorithm list");
    resolve(_allAlgorithmsCache);
    return;
  }

  [self ensureInitializedWithResolver:^(id initResult) {
    RCTLogInfo(@"[Essentia] Retrieving all algorithm names");
    std::string algResult = self->_wrapper->getAllAlgorithms();
    RCTLogInfo(@"[Essentia] Successfully retrieved all algorithm names");

    // Parse the JSON string to an object before resolving
    NSString *jsonString = [NSString stringWithUTF8String:algResult.c_str()];
    id result = [self parseJSONString:jsonString];

    // Cache the result if caching is enabled
    if (self->_isCacheEnabled) {
      @synchronized(self) {
        self->_allAlgorithmsCache = result;
      }
    }

    resolve(result);
  } rejecter:reject];
}

#pragma mark - Feature extraction methods

RCT_EXPORT_METHOD(extractFeatures:(NSArray *)features
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"[Essentia] extractFeatures called with %lu features", (unsigned long)[features count]);

  [self ensureInitializedWithResolver:^(id initResult) {
    // Convert features array to JSON string
    NSError *error;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:features options:0 error:&error];

    if (error) {
      RCTLogError(@"[Essentia] Failed to serialize features: %@", error);
      reject(@"json_error", @"Failed to serialize features", error);
      return;
    }

    NSString *featuresJson = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    RCTLogInfo(@"[Essentia] Extracting features: %@", featuresJson);

    std::string extractResult = self->_featureExtractor->extractFeatures([featuresJson UTF8String]);
    RCTLogInfo(@"[Essentia] Features extracted successfully");

    // Parse the JSON string to an object before resolving
    NSString *jsonString = [NSString stringWithUTF8String:extractResult.c_str()];
    resolve([self parseJSONString:jsonString]);
  } rejecter:reject];
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
  RCTLogInfo(@"[Essentia] computeMelSpectrogram called with frameSize: %@, hopSize: %@, nMels: %@",
             frameSize, hopSize, nMels);

  [self ensureInitializedWithResolver:^(id initResult) {
    RCTLogInfo(@"[Essentia] Computing mel spectrogram with window type: %@", windowType);
    std::string algResult = self->_featureExtractor->computeMelSpectrogram(
      [frameSize intValue],
      [hopSize intValue],
      [nMels intValue],
      [fMin floatValue],
      [fMax floatValue],
      [windowType UTF8String],
      [normalize boolValue],
      [logScale boolValue]
    );
    RCTLogInfo(@"[Essentia] Mel spectrogram computation completed");

    // Parse the JSON string to an object before resolving
    NSString *jsonString = [NSString stringWithUTF8String:algResult.c_str()];
    resolve([self parseJSONString:jsonString]);
  } rejecter:reject];
}

RCT_EXPORT_METHOD(executePipeline:(NSString *)pipelineJsonString
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"[Essentia] executePipeline called");

  [self ensureInitializedWithResolver:^(id initResult) {
    // Validate input
    if ([pipelineJsonString length] == 0) {
      reject(@"essentia_invalid_input", @"Pipeline configuration cannot be empty", nil);
      return;
    }

    RCTLogInfo(@"[Essentia] Executing pipeline with config: %@", pipelineJsonString);

    std::string pipelineResult = self->_featureExtractor->executePipeline([pipelineJsonString UTF8String]);
    RCTLogInfo(@"[Essentia] Pipeline execution completed");

    // Parse the JSON string to an object before resolving
    NSString *jsonString = [NSString stringWithUTF8String:pipelineResult.c_str()];
    resolve([self parseJSONString:jsonString]);
  } rejecter:reject];
}

RCT_EXPORT_METHOD(computeSpectrum:(nonnull NSNumber *)frameSize
                  hopSize:(nonnull NSNumber *)hopSize
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"[Essentia] computeSpectrum called with frameSize: %@, hopSize: %@", frameSize, hopSize);

  [self ensureInitializedWithResolver:^(id initResult) {
    RCTLogInfo(@"[Essentia] Computing spectrum");
    self->_wrapper->computeSpectrum([frameSize intValue], [hopSize intValue]);
    BOOL computed = self->_wrapper->getSpectrumComputed();
    RCTLogInfo(@"[Essentia] Spectrum computation %@", computed ? @"succeeded" : @"failed");

    resolve(@(computed));
  } rejecter:reject];
}

RCT_EXPORT_METHOD(computeTonnetz:(NSArray *)hpcp
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"[Essentia] computeTonnetz called with HPCP array of size %lu", (unsigned long)[hpcp count]);

  [self ensureInitializedWithResolver:^(id initResult) {
    // Validate HPCP array size
    if ([hpcp count] != 12) {
      reject(@"INVALID_INPUT", @"HPCP vector must contain exactly 12 values (one per semitone)", nil);
      return;
    }

    // Convert HPCP array to JSON
    NSError *error;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:hpcp options:0 error:&error];

    if (error) {
      RCTLogError(@"[Essentia] Failed to serialize HPCP data: %@", error);
      reject(@"json_error", @"Failed to serialize HPCP data", error);
      return;
    }

    NSString *hpcpJson = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    RCTLogInfo(@"[Essentia] Computing Tonnetz with HPCP data: %@", hpcpJson);

    std::string tonnetzResult = self->_featureExtractor->applyTonnetzTransform([hpcpJson UTF8String]);
    RCTLogInfo(@"[Essentia] Tonnetz computation completed: %s", tonnetzResult.c_str());

    // Convert the raw result into a properly structured response
    NSString *jsonString = [NSString stringWithUTF8String:tonnetzResult.c_str()];

    // Parse the raw tonnetz values
    id tonnetzValues = [self parseJSONString:jsonString];

    // Create a properly structured response with the tonnetz array and isFrameWise flag
    NSMutableDictionary *resultDict = [NSMutableDictionary dictionary];
    [resultDict setObject:@YES forKey:@"success"];

    NSMutableDictionary *dataDict = [NSMutableDictionary dictionary];
    [dataDict setObject:tonnetzValues forKey:@"tonnetz"];
    [dataDict setObject:@NO forKey:@"isFrameWise"];

    [resultDict setObject:dataDict forKey:@"data"];

    resolve(resultDict);
  } rejecter:reject];
}

RCT_EXPORT_METHOD(testConnection:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"[Essentia] testConnection called");

  [self ensureInitializedWithResolver:^(id initResult) {
    RCTLogInfo(@"[Essentia] Testing connection successful");
    resolve(@"Connection successful (iOS)");
  } rejecter:reject];
}

RCT_EXPORT_METHOD(getVersion:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"[Essentia] getVersion called");

  [self ensureInitializedWithResolver:^(id initResult) {
    RCTLogInfo(@"[Essentia] Retrieving Essentia version");

    // Get Essentia version
    std::string version = essentia::version;
    RCTLogInfo(@"[Essentia] Version: %s", version.c_str());

    // Return as a string
    resolve([NSString stringWithUTF8String:version.c_str()]);
  } rejecter:reject];
}

RCT_EXPORT_METHOD(executeBatch:(NSArray *)algorithms
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"[Essentia] executeBatch called with %lu algorithms", (unsigned long)[algorithms count]);

  // executeBatch is an alias to extractFeatures for compatibility with Android implementation
  [self extractFeatures:algorithms resolver:resolve rejecter:reject];
}

// Add more convenience methods to match your Android implementation

// Helper method to clear cache
- (void)clearCache {
  @synchronized(self) {
    [_algorithmInfoCache removeAllObjects];
    _allAlgorithmsCache = nil;
    RCTLogInfo(@"[Essentia] Algorithm information cache cleared");
  }
}

RCT_EXPORT_METHOD(setCacheEnabled:(BOOL)enabled
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"[Essentia] setCacheEnabled called with enabled: %@", enabled ? @"YES" : @"NO");

  @synchronized(self) {
    _isCacheEnabled = enabled;
    if (!enabled) {
      [self clearCache];
    }
  }
  resolve(@YES);
}

RCT_EXPORT_METHOD(isCacheEnabled:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"[Essentia] isCacheEnabled called");
  resolve(@(_isCacheEnabled));
}

RCT_EXPORT_METHOD(clearCache:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"[Essentia] clearCache called");
  [self clearCache];
  resolve(@YES);
}

// Thread count management methods
RCT_EXPORT_METHOD(setThreadCount:(nonnull NSNumber *)count
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"[Essentia] setThreadCount called with count: %@", count);

  NSInteger newCount = [count integerValue];
  if (newCount <= 0) {
    reject(@"INVALID_THREAD_COUNT", @"Thread count must be greater than 0", nil);
    return;
  }

  @synchronized(self) {
    // Only update if count changed
    if (_threadCount != newCount) {
      _threadCount = newCount;
      // Note: In iOS/GCD, we don't need to recreate the queue as GCD manages threads
      RCTLogInfo(@"[Essentia] Thread count updated to %ld", (long)_threadCount);
    }
  }

  resolve(@YES);
}

RCT_EXPORT_METHOD(getThreadCount:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"[Essentia] getThreadCount called");
  resolve(@(_threadCount));
}

// Helper method to handle errors in result maps
- (BOOL)handleErrorInResultMap:(id)resultMap
                       promise:(RCTPromiseResolveBlock)resolve
                      rejecter:(RCTPromiseRejectBlock)reject {
  if ([resultMap isKindOfClass:[NSDictionary class]]) {
    NSDictionary *resultDict = (NSDictionary *)resultMap;
    id successValue = resultDict[@"success"];

    if (successValue && ![successValue boolValue]) {
      id errorValue = resultDict[@"error"];

      if (errorValue) {
        if ([errorValue isKindOfClass:[NSDictionary class]]) {
          NSDictionary *errorDict = (NSDictionary *)errorValue;
          NSString *code = errorDict[@"code"] ?: @"UNKNOWN_ERROR";
          NSString *message = errorDict[@"message"] ?: @"Unknown error occurred";
          NSString *details = errorDict[@"details"];

          if (details) {
            reject(code, message, [NSError errorWithDomain:@"EssentiaErrorDomain"
                                                      code:1
                                                  userInfo:@{NSLocalizedDescriptionKey: details}]);
          } else {
            reject(code, message, nil);
          }
        } else if ([errorValue isKindOfClass:[NSString class]]) {
          reject(@"NATIVE_ERROR", (NSString *)errorValue, nil);
        } else {
          reject(@"UNKNOWN_ERROR", @"Unknown error type", nil);
        }
        return YES; // Error was found and handled
      } else {
        reject(@"UNKNOWN_ERROR", @"Native execution failed without error details", nil);
        return YES;
      }
    }
  }
  return NO; // No error found
}

@end
