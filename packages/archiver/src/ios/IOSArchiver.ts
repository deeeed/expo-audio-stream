import type { ArchiveEntry, ArchiveHandler } from '../index';
import NativeArchiver from '../NativeArchiver';

export default class IOSArchiver implements ArchiveHandler {
  private nativeModule = NativeArchiver;
  private currentEntries: ArchiveEntry[] = [];
  private currentEntryIndex: number = 0;
  private archivePath: string | null = null;
  private destinationPath: string | null = null;
  private currentFormat: string | null = null;
  private currentEntry: ArchiveEntry | null = null;

  async open(source: string, format?: string): Promise<void> {
    this.archivePath = source;
    this.currentFormat = format || this.detectFormatFromPath(source);

    try {
      // Call native module to open the archive
      await this.nativeModule.openArchive(source, this.currentFormat);
      console.log(`IOSArchiver: Opened archive at ${source} with format ${this.currentFormat}`);
      
      // Reset internal state
      this.currentEntries = [];
      this.currentEntryIndex = 0;
      this.currentEntry = null;
    } catch (error) {
      console.error(`IOSArchiver: Failed to open archive: ${error}`);
      throw error;
    }
  }

  async getNextEntry(): Promise<ArchiveEntry | null> {
    try {
      // If we have no archive path, we can't get entries
      if (!this.archivePath) {
        console.warn('IOSArchiver: No archive is open');
        return null;
      }
      
      // Call native module to get the next entry name
      const entryName = await this.nativeModule.getNextEntryName();
      
      // If null, we've reached the end of the archive
      if (entryName === null) {
        console.log('IOSArchiver: End of archive reached');
        return null;
      }
      
      // Create an entry object
      const isDirectory = entryName.endsWith('/');
      this.currentEntry = {
        name: entryName,
        isDirectory,
      };
      
      console.log(`IOSArchiver: Found entry: ${entryName} (${isDirectory ? 'directory' : 'file'})`);
      return this.currentEntry;
    } catch (error) {
      console.error(`IOSArchiver: Failed to get next entry: ${error}`);
      throw error;
    }
  }

  async extractEntry(entry: ArchiveEntry, destination: string): Promise<void> {
    try {
      // If we have no archive path, we can't extract entries
      if (!this.archivePath) {
        throw new Error('No archive is open');
      }
      
      // Call native module to extract the entry
      console.log(`IOSArchiver: Extracting ${entry.name} to ${destination}`);
      await this.nativeModule.extractEntry(entry.name, destination);
      console.log(`IOSArchiver: Successfully extracted ${entry.name}`);
    } catch (error) {
      console.error(`IOSArchiver: Failed to extract entry: ${error}`);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      // Display debugging information before clearing
      if (this.archivePath) {
        console.log(`IOSArchiver: Closing archive at ${this.archivePath}`);
      }
      
      // Call native module to close the archive
      await this.nativeModule.closeArchive();
      console.log('IOSArchiver: Archive closed');
    } catch (error) {
      console.error(`IOSArchiver: Error closing archive: ${error}`);
    } finally {
      // Reset internal state
      this.archivePath = null;
      this.currentEntries = [];
      this.currentEntryIndex = 0;
      this.currentFormat = null;
      this.destinationPath = null;
      this.currentEntry = null;
    }
  }

  async create(destination: string, format: string): Promise<void> {
    this.destinationPath = destination;
    this.currentFormat = format;

    // Not yet implemented in native code
    console.warn(
      `IOSArchiver: Would create ${this.currentFormat} archive at ${this.destinationPath}`
    );
  }

  async addEntry(entry: ArchiveEntry): Promise<void> {
    // Not yet implemented in native code
    if (this.destinationPath) {
      console.warn(`IOSArchiver: Would add entry ${entry.name} to ${this.destinationPath}`);
    } else {
      console.warn('IOSArchiver: Would add entry', entry.name);
    }
  }

  async finalize(): Promise<void> {
    // Not yet implemented in native code
    if (this.destinationPath && this.currentFormat) {
      console.warn(`IOSArchiver: Would finalize ${this.currentFormat} archive at ${this.destinationPath}`);
    } else {
      console.warn('IOSArchiver: Would finalize archive');
    }
  }

  async supportedFormats(): Promise<string[]> {
    try {
      // Call native module to get supported formats
      return await this.nativeModule.getSupportedFormats();
    } catch (error) {
      console.error(`IOSArchiver: Failed to get supported formats: ${error}`);
      // Return default formats if native call fails
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
