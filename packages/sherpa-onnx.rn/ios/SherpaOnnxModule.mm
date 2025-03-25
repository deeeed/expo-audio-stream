#import "SherpaOnnxModule.h"

@implementation SherpaOnnxModule

RCT_EXPORT_MODULE(SherpaOnnx);

// Create a boolean to track if the library has loaded
static BOOL libraryLoaded = NO;

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

+ (void)initialize {
    // Attempt to load the library
    NSString *libraryPath = [[NSBundle mainBundle] pathForResource:@"libsherpa-onnx" ofType:@"a"];
    if (libraryPath) {
        NSLog(@"Found sherpa-onnx library at: %@", libraryPath);
        libraryLoaded = YES;
    } else {
        NSLog(@"Failed to find sherpa-onnx library");
        libraryLoaded = NO;
    }
}

RCT_EXPORT_METHOD(validateLibraryLoaded:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    NSMutableDictionary *result = [NSMutableDictionary dictionary];
    [result setObject:@(libraryLoaded) forKey:@"loaded"];
    
    if (libraryLoaded) {
        [result setObject:@"Sherpa ONNX library loaded successfully" forKey:@"status"];
    } else {
        [result setObject:@"Failed to load Sherpa ONNX library" forKey:@"status"];
    }
    
    resolve(result);
}

RCT_EXPORT_METHOD(generateTts:(NSDictionary *)config
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Extract parameters from config dictionary
    NSString *text = [config objectForKey:@"text"] ? [config objectForKey:@"text"] : @"";
    NSInteger speakerId = [config objectForKey:@"speakerId"] ? [[config objectForKey:@"speakerId"] integerValue] : 0;
    float speed = [config objectForKey:@"speakingRate"] ? [[config objectForKey:@"speakingRate"] floatValue] : 1.0f;
    BOOL playAudio = [config objectForKey:@"playAudio"] ? [[config objectForKey:@"playAudio"] boolValue] : NO;
    NSString *fileNamePrefix = [config objectForKey:@"fileNamePrefix"];
    NSNumber *lengthScale = [config objectForKey:@"lengthScale"];
    NSNumber *noiseScale = [config objectForKey:@"noiseScale"];
    NSNumber *noiseScaleW = [config objectForKey:@"noiseScaleW"];
    
    // Implementation for iOS would go here
    // Currently, just return a not implemented error
    NSString *errorMsg = @"TTS functionality is not yet implemented on iOS";
    reject(@"ERR_NOT_IMPLEMENTED", errorMsg, nil);
}

@end 