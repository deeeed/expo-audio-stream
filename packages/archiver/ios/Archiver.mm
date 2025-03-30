#import "Archiver.h"
#import <React/RCTLog.h>
#include <dlfcn.h>

// Import React-Core headers - needed for RCT_NEW_ARCH_ENABLED macro
#import <React/RCTBridge.h>
#import <React/RCTUIManager.h>

@implementation Archiver

// This macro registers the module for the old bridge.
// It's generally kept even for TurboModules, but registration
// for the new arch primarily happens via getTurboModule.
RCT_EXPORT_MODULE()

- (instancetype)init {
    self = [super init];
    if (self) {
        _currentArchiveRead = NULL;
        _currentEntry = NULL;
        [self debugBzip2Availability];
    }
    return self;
}

// Debug method to check if bzip2 symbols are available
- (void)debugBzip2Availability {
    RCTLogInfo(@"Checking bzip2 availability...");
    
    // Try to dynamically load libbz2
    void* handle = dlopen("/usr/lib/libbz2.dylib", RTLD_LAZY);
    if (handle) {
        void* decompressSymbol = dlsym(handle, "BZ2_bzDecompress");
        void* compressSymbol = dlsym(handle, "BZ2_bzCompress");
        
        RCTLogInfo(@"BZ2_bzDecompress symbol %@", decompressSymbol ? @"found" : @"not found");
        RCTLogInfo(@"BZ2_bzCompress symbol %@", compressSymbol ? @"found" : @"not found");
        
        if (!decompressSymbol || !compressSymbol) {
            RCTLogError(@"Some bzip2 symbols not found. Error: %s", dlerror());
        }
        
        dlclose(handle);
    } else {
        RCTLogError(@"Could not load libbz2: %s", dlerror());
    }
}

- (void)dealloc {
    [self closeArchiveInternal];
}

// Helper method to close any open archives
- (void)closeArchiveInternal {
    if (_currentArchiveRead != NULL) {
        archive_read_close(_currentArchiveRead);
        archive_read_free(_currentArchiveRead);
        _currentArchiveRead = NULL;
    }
    
    _currentEntry = NULL;
}

// Method for TurboModule spec (can be kept for both)
- (NSNumber *)multiply:(double)a b:(double)b {
    NSNumber *result = @(a * b);
    return result;
}

// Export methods for the OLD bridge using RCT_EXPORT_METHOD
// These signatures must match the ones in NativeArchiverSpec for TurboModules

// Explicitly name the JS function for the macro
RCT_REMAP_METHOD(openArchive,
                 openArchiveWithPath:(NSString *)path
                 format:(NSString *)format
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    // --- Simple Placeholder Implementation ---
    RCTLogInfo(@"[Archiver Placeholder] openArchive called for path: %@, format: %@", path, format);
    _currentArchiveRead = (struct archive*)0xDEADBEEF; // Non-NULL placeholder pointer
    _currentEntry = NULL;
    resolve(@(YES)); // Simulate success
}

RCT_EXPORT_METHOD(closeArchive:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    // --- Simple Placeholder Implementation ---
    RCTLogInfo(@"[Archiver Placeholder] closeArchive called");
    _currentArchiveRead = NULL; // Clear placeholder pointer
    _currentEntry = NULL;
    resolve(@(YES)); // Simulate success
}

RCT_EXPORT_METHOD(getNextEntryName:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    // --- Simple Placeholder Implementation ---
    RCTLogInfo(@"[Archiver Placeholder] getNextEntryName called");
    // Simulate finding one entry then EOF to avoid infinite loops in JS
    static BOOL firstCall = YES;
    if (firstCall) {
        RCTLogInfo(@"[Archiver Placeholder] Simulating finding 'placeholder_entry.txt'");
        _currentEntry = (struct archive_entry*)0xCAFEBABE; // Non-NULL placeholder
        firstCall = NO;
        resolve(@"placeholder_entry.txt");
    } else {
        RCTLogInfo(@"[Archiver Placeholder] Simulating EOF");
        _currentEntry = NULL;
        firstCall = YES; // Reset for next open cycle
        resolve([NSNull null]); // Simulate end of archive
    }
}

RCT_EXPORT_METHOD(extractEntry:(NSString *)entryName
                  destination:(NSString *)destination
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    // --- Simple Placeholder Implementation ---
    RCTLogInfo(@"[Archiver Placeholder] extractEntry called for entry: %@, destination: %@", entryName, destination);
    if (_currentEntry == NULL || ![entryName isEqualToString:@"placeholder_entry.txt"]) {
         RCTLogError(@"[Archiver Placeholder] Attempted to extract non-current/invalid entry");
         reject(@"EINVAL", @"Placeholder cannot extract this entry", nil);
         return;
    }
    resolve(@(YES)); // Simulate success
}

RCT_EXPORT_METHOD(getSupportedFormats:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    NSArray *formats = @[@"zip", @"tar", @"tar.gz", @"tar.bz2"];
    resolve(formats);
}

// --- ADD STUBS FOR MISSING PROTOCOL METHODS ---

RCT_EXPORT_METHOD(createArchive:(NSString *)path
                  format:(NSString *)format
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    RCTLogWarn(@"[Archiver] createArchive is not implemented yet.");
    reject(@"ENOSYS", @"createArchive is not implemented", nil);
}

RCT_EXPORT_METHOD(addFileEntry:(NSString *)name
                  sourcePath:(NSString *)sourcePath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    RCTLogWarn(@"[Archiver] addFileEntry is not implemented yet.");
    reject(@"ENOSYS", @"addFileEntry is not implemented", nil);
}

RCT_EXPORT_METHOD(addDirectoryEntry:(NSString *)name
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    RCTLogWarn(@"[Archiver] addDirectoryEntry is not implemented yet.");
    reject(@"ENOSYS", @"addDirectoryEntry is not implemented", nil);
}

RCT_EXPORT_METHOD(finalizeArchive:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    RCTLogWarn(@"[Archiver] finalizeArchive is not implemented yet.");
    reject(@"ENOSYS", @"finalizeArchive is not implemented", nil);
}

// --- END OF ADDED STUBS ---

// Conditionally compile getTurboModule only for the New Architecture
#if RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    RCTLogInfo(@"[Archiver] getTurboModule called - New Architecture IS active.");
    // Return the JSI-HostObject-based spec implementation
    // Make sure the namespace and class name match your generated file (`RNArchiverSpecJSI.h`)
    return std::make_shared<facebook::react::NativeArchiverSpecJSI>(params);
}
#endif // RCT_NEW_ARCH_ENABLED

@end
