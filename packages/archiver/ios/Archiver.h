#import "generated/RNArchiverSpec/RNArchiverSpec.h"
#import "archive.h"
#import "archive_entry.h"

@interface Archiver : NSObject <NativeArchiverSpec>

// Archive handling properties
@property (nonatomic, assign) struct archive *currentArchiveRead;
@property (nonatomic, assign) struct archive_entry *currentEntry;

@end
