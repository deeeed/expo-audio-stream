import type { ArchiveEntry, ArchiveHandler } from '../index';
import NativeArchiver from '../NativeArchiver';

export default class IOSArchiver implements ArchiveHandler {
  // @ts-ignore - Will be used in future implementation
  private nativeModule = NativeArchiver;
  private currentEntries: ArchiveEntry[] = [];
  private currentEntryIndex: number = 0;
  private archivePath: string | null = null;
  private destinationPath: string | null = null;
  private currentFormat: string | null = null;

  async open(source: string, format?: string): Promise<void> {
    this.archivePath = source;
    this.currentFormat = format || this.detectFormatFromPath(source);

    // In a real implementation, would call native module
    // await this.nativeModule.openArchive(source, this.currentFormat);

    // Placeholder implementation
    console.warn(
      `IOSArchiver: Native implementation required for ${this.archivePath} with format ${this.currentFormat}`
    );
    this.currentEntries = [];
    this.currentEntryIndex = 0;
  }

  async getNextEntry(): Promise<ArchiveEntry | null> {
    // In a real implementation, would call native module
    // const nextEntry = await this.nativeModule.getNextEntry();

    // Placeholder implementation
    if (this.currentEntryIndex >= this.currentEntries.length) {
      return null;
    }

    const entry = this.currentEntries[this.currentEntryIndex++];
    return entry || null;
  }

  async extractEntry(entry: ArchiveEntry, destination: string): Promise<void> {
    // In a real implementation, would call native module
    // await this.nativeModule.extractEntry(entry.name, destination);

    // Placeholder implementation
    console.warn('IOSArchiver: Would extract', entry.name, 'to', destination);
  }

  async close(): Promise<void> {
    // In a real implementation, would call native module
    // await this.nativeModule.closeArchive();

    // Display debuggng information before clearing
    if (this.archivePath) {
      console.debug(`Closing archive at ${this.archivePath}`);
    }
    
    this.archivePath = null;
    this.currentEntries = [];
    this.currentEntryIndex = 0;
    this.currentFormat = null;
    this.destinationPath = null;
  }

  async create(destination: string, format: string): Promise<void> {
    this.destinationPath = destination;
    this.currentFormat = format;

    // In a real implementation, would call native module
    // await this.nativeModule.createArchive(destination, format);

    console.warn(
      `IOSArchiver: Would create ${this.currentFormat} archive at ${this.destinationPath}`
    );
  }

  async addEntry(entry: ArchiveEntry): Promise<void> {
    // In a real implementation, would call native module
    // If entry is file:
    // await this.nativeModule.addFileEntry(entry.name, entry.data);
    // If entry is directory:
    // await this.nativeModule.addDirectoryEntry(entry.name);

    if (this.destinationPath) {
      console.warn(`IOSArchiver: Would add entry ${entry.name} to ${this.destinationPath}`);
    } else {
      console.warn('IOSArchiver: Would add entry', entry.name);
    }
  }

  async finalize(): Promise<void> {
    // In a real implementation, would call native module
    // await this.nativeModule.finalizeArchive();

    if (this.destinationPath && this.currentFormat) {
      console.warn(`IOSArchiver: Would finalize ${this.currentFormat} archive at ${this.destinationPath}`);
    } else {
      console.warn('IOSArchiver: Would finalize archive');
    }
  }

  async supportedFormats(): Promise<string[]> {
    // In a real implementation, would call native module
    // return await this.nativeModule.getSupportedFormats();

    // iOS typically supports these formats via libarchive
    return ['zip', 'tar', 'tar.gz', 'tar.bz2'];
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
