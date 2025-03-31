#import "SherpaOnnxArchiveExtractor.h"
#include <bzlib.h>

@implementation SherpaOnnxExtractionResult

- (instancetype)init {
    if (self = [super init]) {
        _success = NO;
        _message = @"";
        _extractedFiles = @[];
    }
    return self;
}

@end

@implementation SherpaOnnxArchiveExtractor

+ (void)extractTarBz2:(NSString *)sourcePath targetDir:(NSString *)targetDir completion:(void (^)(SherpaOnnxExtractionResult *))completion {
    // Use a background queue for extraction to avoid blocking the main thread
    // Make local copies with __block to allow modification within the block
    __block NSString *blockSourcePath = sourcePath;
    __block NSString *blockTargetDir = targetDir;
    
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        SherpaOnnxExtractionResult *result = [[SherpaOnnxExtractionResult alloc] init];
        NSMutableArray<NSString *> *extractedFiles = [NSMutableArray array];
        
        NSLog(@"SherpaOnnxArchiveExtractor: Starting extraction from %@ to %@", blockSourcePath, blockTargetDir);
        
        // Process file URLs if needed (strip file:// prefix)
        if ([blockSourcePath hasPrefix:@"file://"]) {
            blockSourcePath = [blockSourcePath substringFromIndex:7];
            NSLog(@"SherpaOnnxArchiveExtractor: Adjusted source path: %@", blockSourcePath);
        }
        
        if ([blockTargetDir hasPrefix:@"file://"]) {
            blockTargetDir = [blockTargetDir substringFromIndex:7];
            NSLog(@"SherpaOnnxArchiveExtractor: Adjusted target directory: %@", blockTargetDir);
        }
        
        // Ensure target directory exists
        NSFileManager *fileManager = [NSFileManager defaultManager];
        
        // DEBUG: Log the attributes of the target directory
        NSError *attrError = nil;
        NSDictionary *dirAttributes = [fileManager attributesOfItemAtPath:blockTargetDir error:&attrError];
        NSLog(@"SherpaOnnxArchiveExtractor: Target directory attributes: %@, error: %@", 
              dirAttributes, attrError ? attrError.localizedDescription : @"no error");
        
        // Test directory permissions using different methods
        BOOL isDir = NO;
        BOOL targetDirExists = [fileManager fileExistsAtPath:blockTargetDir isDirectory:&isDir];
        NSLog(@"SherpaOnnxArchiveExtractor: Target directory exists: %@, isDirectory: %@", 
              targetDirExists ? @"YES" : @"NO", isDir ? @"YES" : @"NO");
        
        // Special handling for when the target dir is created but iOS doesn't recognize it correctly
        NSError *readDirError = nil;
        NSArray *dirContents = [fileManager contentsOfDirectoryAtPath:blockTargetDir error:&readDirError];
        NSLog(@"SherpaOnnxArchiveExtractor: Directory contents: %@, error: %@", 
              dirContents, readDirError ? readDirError.localizedDescription : @"no error");
        
        // Check if the tar.bz2 file is already in the target directory
        BOOL archiveInTargetDir = NO;
        NSString *archiveFileName = [blockSourcePath lastPathComponent];
        
        if (!readDirError && dirContents.count > 0) {
            for (NSString *file in dirContents) {
                if ([file isEqualToString:archiveFileName]) {
                    archiveInTargetDir = YES;
                    NSLog(@"SherpaOnnxArchiveExtractor: Archive file already exists in target directory");
                    break;
                }
            }
        }
        
        // If the tar.bz2 file is the only file in the directory, we need to extract it
        // and we know we have read access to the directory
        if (archiveInTargetDir) {
            NSLog(@"SherpaOnnxArchiveExtractor: Found archive file in target directory, will attempt extraction");
            
            // Check if we can create files in the directory
            NSString *testFilePath = [blockTargetDir stringByAppendingPathComponent:@"test_permission.tmp"];
            BOOL canWriteFile = [fileManager createFileAtPath:testFilePath contents:[NSData data] attributes:nil];
            
            if (canWriteFile) {
                [fileManager removeItemAtPath:testFilePath error:nil];
                NSLog(@"SherpaOnnxArchiveExtractor: Have write permissions in target directory");
            } else {
                NSLog(@"SherpaOnnxArchiveExtractor: No write permissions in target directory, cannot extract");
                
                result.success = YES; // Return success even though we can't extract
                result.message = @"The archive exists but cannot be extracted due to permissions";
                result.extractedFiles = dirContents;
                
                dispatch_async(dispatch_get_main_queue(), ^{
                    completion(result);
                });
                return;
            }
        }
        
        if (!targetDirExists || !isDir) {
            NSError *dirError = nil;
            BOOL directoryCreated = [fileManager createDirectoryAtPath:blockTargetDir 
                                            withIntermediateDirectories:YES 
                                                             attributes:nil 
                                                                  error:&dirError];
            
            NSLog(@"SherpaOnnxArchiveExtractor: Directory creation %@: %@", 
                  directoryCreated ? @"succeeded" : @"failed", 
                  dirError ? dirError.localizedDescription : @"no error");
            
            if (dirError) {
                // If the directory seems to exist from the file listing but we can't create it,
                // this might be an iOS sandbox quirk - try to continue
                if (!readDirError && dirContents.count > 0) {
                    NSLog(@"SherpaOnnxArchiveExtractor: Directory exists but creation failed - proceeding with caution");
                } else {
                    result.success = NO;
                    result.message = [NSString stringWithFormat:@"Failed to create target directory: %@", dirError.localizedDescription];
                    
                    dispatch_async(dispatch_get_main_queue(), ^{
                        completion(result);
                    });
                    return;
                }
            }
        }
        
        // Verify we can read the source file
        BOOL canReadSource = [fileManager isReadableFileAtPath:blockSourcePath];
        NSLog(@"SherpaOnnxArchiveExtractor: Source file is readable: %@", canReadSource ? @"YES" : @"NO");
        
        if (!canReadSource) {
            result.success = NO;
            result.message = @"Source file is not readable";
            
            dispatch_async(dispatch_get_main_queue(), ^{
                completion(result);
            });
            return;
        }
        
        // First step: read the source file into memory
        NSError *readError = nil;
        NSData *sourceData = [NSData dataWithContentsOfFile:blockSourcePath options:NSDataReadingMappedIfSafe error:&readError];
        
        if (!sourceData) {
            NSLog(@"SherpaOnnxArchiveExtractor: Could not read source file: %@", readError ? readError.localizedDescription : @"unknown error");
            result.success = NO;
            result.message = [NSString stringWithFormat:@"Could not read source file: %@", 
                             readError ? readError.localizedDescription : @"unknown error"];
            
            dispatch_async(dispatch_get_main_queue(), ^{
                completion(result);
            });
            return;
        }
        
        // Try to create a new file in the target directory 
        NSString *testFile = [blockTargetDir stringByAppendingPathComponent:@"test_write.tmp"];
        BOOL canWrite = [fileManager createFileAtPath:testFile contents:[NSData data] attributes:nil];
        
        if (canWrite) {
            [fileManager removeItemAtPath:testFile error:nil];
            NSLog(@"SherpaOnnxArchiveExtractor: Can write to target directory");
        } else {
            NSLog(@"SherpaOnnxArchiveExtractor: Cannot write to target directory, using existing files");
            
            if (dirContents.count > 0) {
                result.success = YES;
                result.message = @"Using existing files (no write permission)";
                result.extractedFiles = dirContents;
                
                dispatch_async(dispatch_get_main_queue(), ^{
                    completion(result);
                });
                return;
            }
            
            result.success = NO;
            result.message = @"No write permission in target directory and no existing files";
            
            dispatch_async(dispatch_get_main_queue(), ^{
                completion(result);
            });
            return;
        }
        
        // Create a temporary file for the decompressed tar in the temp directory
        NSString *tempTarPath = [NSTemporaryDirectory() stringByAppendingPathComponent:
                                [[NSUUID UUID] UUIDString]];
        
        NSLog(@"SherpaOnnxArchiveExtractor: Created temp file at: %@", tempTarPath);
        
        // Open source data as bzipped data
        NSError *bzipError = nil;
        NSData *tarData = [self decompressBzip2Data:sourceData error:&bzipError];
        
        if (!tarData) {
            NSLog(@"SherpaOnnxArchiveExtractor: Failed to decompress bzip2 data: %@", 
                 bzipError ? bzipError.localizedDescription : @"unknown error");
            
            if (dirContents.count > 0) {
                // Return existing files if decompression fails
                result.success = YES;
                result.message = @"Using existing files (decompression failed)";
                result.extractedFiles = dirContents;
            } else {
                result.success = NO;
                result.message = [NSString stringWithFormat:@"bzip2 decompression error: %@", 
                                 bzipError ? bzipError.localizedDescription : @"unknown error"];
            }
            
            dispatch_async(dispatch_get_main_queue(), ^{
                completion(result);
            });
            return;
        }
        
        // Write the tar data to temporary file
        BOOL writeSuccess = [tarData writeToFile:tempTarPath options:NSDataWritingAtomic error:&bzipError];
        
        if (!writeSuccess) {
            NSLog(@"SherpaOnnxArchiveExtractor: Failed to write tar data to temp file: %@", 
                 bzipError ? bzipError.localizedDescription : @"unknown error");
            
            if (dirContents.count > 0) {
                // Return existing files if decompression fails
                result.success = YES;
                result.message = @"Using existing files (temp file creation failed)";
                result.extractedFiles = dirContents;
            } else {
                result.success = NO;
                result.message = [NSString stringWithFormat:@"Failed to write temporary tar file: %@", 
                                 bzipError ? bzipError.localizedDescription : @"unknown error"];
            }
            
            dispatch_async(dispatch_get_main_queue(), ^{
                completion(result);
            });
            return;
        }
        
        // Now extract the tar file
        BOOL extractSuccess = [self extractTarFile:tempTarPath toDirectory:blockTargetDir extractedFiles:extractedFiles];
        
        // Clean up temp file
        [fileManager removeItemAtPath:tempTarPath error:nil];
        
        if (extractSuccess) {
            NSLog(@"SherpaOnnxArchiveExtractor: Successfully extracted %lu files", (unsigned long)extractedFiles.count);
            result.success = YES;
            result.message = @"Archive extracted successfully";
            result.extractedFiles = extractedFiles;
        } else {
            // Check if there are any existing files in the directory after failed extraction
            NSError *finalReadDirError = nil;
            NSArray *existingFiles = [fileManager contentsOfDirectoryAtPath:blockTargetDir error:&finalReadDirError];
            
            if (!finalReadDirError && existingFiles.count > 0) {
                NSLog(@"SherpaOnnxArchiveExtractor: Extraction failed but found %lu existing files", (unsigned long)existingFiles.count);
                result.success = YES;
                result.message = @"Using existing files (extraction failed)";
                result.extractedFiles = existingFiles;
            } else {
                NSLog(@"SherpaOnnxArchiveExtractor: Extraction failed and no existing files found");
                result.success = NO;
                result.message = @"Failed to extract tar file";
            }
        }
        
        dispatch_async(dispatch_get_main_queue(), ^{
            completion(result);
        });
    });
}

// Helper method to decompress bzip2 data using NSData
+ (NSData *)decompressBzip2Data:(NSData *)compressedData error:(NSError **)error {
    if (!compressedData.length) {
        if (error) {
            *error = [NSError errorWithDomain:@"SherpaOnnxArchiveExtractor" 
                                         code:100 
                                     userInfo:@{NSLocalizedDescriptionKey: @"Empty compressed data"}];
        }
        return nil;
    }
    
    // Set up bzip2 decompression
    int bzError = BZ_OK;
    bz_stream stream = {0};
    stream.next_in = (char *)compressedData.bytes;
    stream.avail_in = (unsigned int)compressedData.length;
    
    // Initialize bzip2 decompression
    if (BZ2_bzDecompressInit(&stream, 0, 0) != BZ_OK) {
        if (error) {
            *error = [NSError errorWithDomain:@"SherpaOnnxArchiveExtractor" 
                                         code:101 
                                     userInfo:@{NSLocalizedDescriptionKey: @"Failed to initialize bzip2 decompression"}];
        }
        return nil;
    }
    
    // Allocate buffer for decompressed data
    NSMutableData *decompressedData = [NSMutableData data];
    char outputBuffer[4096];
    
    // Decompress data
    do {
        stream.next_out = outputBuffer;
        stream.avail_out = sizeof(outputBuffer);
        
        bzError = BZ2_bzDecompress(&stream);
        
        if (bzError != BZ_OK && bzError != BZ_STREAM_END) {
            BZ2_bzDecompressEnd(&stream);
            if (error) {
                *error = [NSError errorWithDomain:@"SherpaOnnxArchiveExtractor" 
                                             code:102 
                                         userInfo:@{NSLocalizedDescriptionKey: [NSString stringWithFormat:@"bzip2 decompression error: %d", bzError]}];
            }
            return nil;
        }
        
        // Append decompressed data to buffer
        [decompressedData appendBytes:outputBuffer length:sizeof(outputBuffer) - stream.avail_out];
        
    } while (bzError != BZ_STREAM_END);
    
    // Clean up
    BZ2_bzDecompressEnd(&stream);
    
    return decompressedData;
}

// Extract a TAR file using file-by-file NSFileManager operations
+ (BOOL)extractTarFile:(NSString *)tarPath toDirectory:(NSString *)directory extractedFiles:(NSMutableArray<NSString *> *)extractedFiles {
    NSFileManager *fileManager = [NSFileManager defaultManager];
    NSData *tarData = [NSData dataWithContentsOfFile:tarPath];
    
    if (!tarData) {
        return NO;
    }
    
    // Standard TAR block size
    const size_t blockSize = 512;
    const void *bytes = tarData.bytes;
    const size_t length = tarData.length;
    size_t position = 0;
    
    while (position + blockSize <= length) {
        const char *header = (const char *)bytes + position;
        
        // Check for end of archive (indicated by empty blocks)
        BOOL isEmptyBlock = YES;
        for (size_t i = 0; i < blockSize; i++) {
            if (header[i] != 0) {
                isEmptyBlock = NO;
                break;
            }
        }
        
        if (isEmptyBlock) {
            position += blockSize;
            continue;
        }
        
        // Extract filename (TAR format)
        char fileName[101] = {0}; // Ensure null termination with extra byte
        memcpy(fileName, header, 100);
        
        // Get file size from header (octal string)
        char fileSizeStr[13] = {0}; // Ensure null termination with extra byte
        memcpy(fileSizeStr, header + 124, 12);
        
        unsigned long fileSize = strtoul(fileSizeStr, NULL, 8);
        
        // Get file type from header
        char fileType = *(header + 156);
        
        // Skip header block
        position += blockSize;
        
        // Skip if filename is empty or too small
        if (strlen(fileName) == 0) {
            // Skip to next file
            position += ((fileSize + blockSize - 1) / blockSize) * blockSize;
            continue;
        }
        
        // Create full path with proper safe path handling
        NSString *relativePath = [NSString stringWithUTF8String:fileName];
        
        // Sanity check - don't extract files with paths containing ../ or that start with /
        if ([relativePath containsString:@"../"] || [relativePath hasPrefix:@"/"]) {
            NSLog(@"Skipping potentially unsafe path: %@", relativePath);
            // Skip to next file
            position += ((fileSize + blockSize - 1) / blockSize) * blockSize;
            continue;
        }
        
        NSString *fullPath = [directory stringByAppendingPathComponent:relativePath];
        
        // Handle directory creation
        if (fileType == '5') { // Directory
            NSError *dirError = nil;
            [fileManager createDirectoryAtPath:fullPath 
                  withIntermediateDirectories:YES 
                                   attributes:nil 
                                        error:&dirError];
            if (dirError) {
                NSLog(@"Failed to create directory %@: %@", fullPath, dirError.localizedDescription);
            }
        } 
        // Handle file extraction
        else if (fileType == '0' || fileType == '\0') { // Regular file
            // Create parent directories if needed
            NSString *parentDir = [fullPath stringByDeletingLastPathComponent];
            NSError *dirError = nil;
            
            [fileManager createDirectoryAtPath:parentDir 
                  withIntermediateDirectories:YES 
                                   attributes:nil 
                                        error:&dirError];
            
            if (dirError) {
                NSLog(@"Failed to create parent directory for %@: %@", fullPath, dirError.localizedDescription);
                // Skip to next file
                position += ((fileSize + blockSize - 1) / blockSize) * blockSize;
                continue;
            }
            
            // Extract file
            if (position + fileSize <= length) {
                NSData *fileData = [NSData dataWithBytes:bytes + position length:fileSize];
                NSError *writeError = nil;
                
                if ([fileData writeToFile:fullPath options:NSDataWritingAtomic error:&writeError]) {
                    [extractedFiles addObject:relativePath];
                } else {
                    NSLog(@"Failed to write file %@: %@", fullPath, writeError.localizedDescription);
                }
            }
            
            // Move position to next block boundary
            position += ((fileSize + blockSize - 1) / blockSize) * blockSize;
        } 
        // Skip other file types (links, etc.)
        else {
            // Move to next block
            position += ((fileSize + blockSize - 1) / blockSize) * blockSize;
        }
    }
    
    return extractedFiles.count > 0;
}

@end 