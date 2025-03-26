#import <React/RCTBridgeModule.h>

@interface SherpaOnnxModule : NSObject <RCTBridgeModule>

// Properties to match Android implementation
@property (nonatomic, assign) BOOL isGenerating;
@property (nonatomic, assign) void* ttsPtr;
@property (nonatomic, assign) void* audioTaggingPtr;
@property (nonatomic, assign) void* streamPtr;
@property (nonatomic, assign) void* asrPtr;
@property (nonatomic, assign) void* speakerIdPtr;
@property (nonatomic, assign) void* speakerManagerPtr;

@end 