#ifndef SherpaOnnxArchiveExtractor_h
#define SherpaOnnxArchiveExtractor_h

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * Result object for extraction operations
 */
@interface SherpaOnnxExtractionResult : NSObject

@property (nonatomic, assign) BOOL success;
@property (nonatomic, strong) NSString *message;
@property (nonatomic, strong) NSArray<NSString *> *extractedFiles;

@end

/**
 * Utility class for extracting compressed archives
 * Uses direct library calls instead of spawning processes or using command line tools
 */
@interface SherpaOnnxArchiveExtractor : NSObject

/**
 * Extract a tar.bz2 file to the target directory
 *
 * @param sourcePath Path to the source .tar.bz2 file
 * @param targetDir Directory where files should be extracted
 * @param completion Completion handler called with the extraction result
 */
+ (void)extractTarBz2:(NSString *)sourcePath
            targetDir:(NSString *)targetDir
           completion:(void (^)(SherpaOnnxExtractionResult *result))completion;

@end

NS_ASSUME_NONNULL_END

#endif /* SherpaOnnxArchiveExtractor_h */ 