import type { ArchiveEntry, ArchiveHandler } from '../index';
import NativeArchiver from '../NativeArchiver';

export default class AndroidArchiver implements ArchiveHandler {
  private nativeModule = NativeArchiver;
  private currentEntries: ArchiveEntry[] = [];
  private currentEntryIndex: number = 0;
  private archivePath: string | null = null;
  private destinationPath: string | null = null;
  private currentFormat: string | null = null;
  private tempDir: string | null = null;

  async open(source: string, format?: string): Promise<void> {
    this.archivePath = source;
    this.currentFormat = format || this.detectFormatFromPath(source);

    try {
      // Call native module to open the archive
      await this.nativeModule.openArchive(source, this.currentFormat);

      // Reset entry tracking
      this.currentEntries = [];
      this.currentEntryIndex = 0;
    } catch (error) {
      throw new Error(`Failed to open archive: ${error}`);
    }
  }

  async getNextEntry(): Promise<ArchiveEntry | null> {
    try {
      // Get next entry name from native module
      const entryName = await this.nativeModule.getNextEntryName();

      if (entryName === null) {
        return null;
      }

      // Create entry object
      const entry: ArchiveEntry = {
        name: entryName,
        isDirectory: entryName.endsWith('/'),
      };

      return entry;
    } catch (error) {
      throw new Error(`Failed to get next entry: ${error}`);
    }
  }

  async extractEntry(entry: ArchiveEntry, destination: string): Promise<void> {
    try {
      // Call native module to extract the entry
      await this.nativeModule.extractEntry(entry.name, destination);
    } catch (error) {
      throw new Error(`Failed to extract entry: ${error}`);
    }
  }

  async close(): Promise<void> {
    try {
      // Call native module to close the archive
      await this.nativeModule.closeArchive();

      this.archivePath = null;
      this.currentEntries = [];
      this.currentEntryIndex = 0;
    } catch (error) {
      throw new Error(`Failed to close archive: ${error}`);
    }
  }

  async create(destination: string, format: string): Promise<void> {
    try {
      this.destinationPath = destination;
      this.currentFormat = format;

      // Call native module to create the archive
      await this.nativeModule.createArchive(destination, format);
    } catch (error) {
      throw new Error(`Failed to create archive: ${error}`);
    }
  }

  async addEntry(entry: ArchiveEntry): Promise<void> {
    try {
      if (entry.isDirectory) {
        // Add directory entry
        await this.nativeModule.addDirectoryEntry(entry.name);
      } else {
        if (!entry.data) {
          throw new Error('Data must be provided for file entries');
        }

        // For file entries, we need to write the data to a temporary file first
        // then add it to the archive
        // This would require file system access to create temp files

        // In a real implementation, you'd:
        // 1. Write the data to a temp file
        // 2. Call addFileEntry with the temp file path
        // 3. Delete the temp file after

        throw new Error(
          'Adding file entries with data not implemented in this example'
        );
        // In a real implementation:
        // const tempFile = await this.writeToTempFile(entry.data);
        // await this.nativeModule.addFileEntry(entry.name, tempFile);
        // await this.deleteTempFile(tempFile);
      }
    } catch (error) {
      throw new Error(`Failed to add entry: ${error}`);
    }
  }

  async finalize(): Promise<void> {
    try {
      // Call native module to finalize the archive
      await this.nativeModule.finalizeArchive();
    } catch (error) {
      throw new Error(`Failed to finalize archive: ${error}`);
    }
  }

  async supportedFormats(): Promise<string[]> {
    try {
      // Get supported formats from native module
      return await this.nativeModule.getSupportedFormats();
    } catch (error) {
      // Fallback if native call fails
      return ['zip', 'tar', 'tar.gz', 'tar.bz2'];
    }
  }

  // Helper method to detect format from file path
  private detectFormatFromPath(path: string): string {
    if (path.endsWith('.zip')) return 'zip';
    if (path.endsWith('.tar')) return 'tar';
    if (path.endsWith('.tar.gz') || path.endsWith('.tgz')) return 'tar.gz';
    if (path.endsWith('.tar.bz2') || path.endsWith('.tbz2')) return 'tar.bz2';

    // Default to zip if unknown
    return 'zip';
  }
}
