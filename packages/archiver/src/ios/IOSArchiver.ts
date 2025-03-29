import type { ArchiveEntry, ArchiveHandler } from '../index';
import NativeArchiver from '../NativeArchiver';

export default class IOSArchiver implements ArchiveHandler {
  private _nativeModule = NativeArchiver;
  private currentEntries: ArchiveEntry[] = [];
  private currentEntryIndex: number = 0;
  private _archivePath: string | null = null;
  private _destinationPath: string | null = null;
  private _currentFormat: string | null = null;

  async open(source: string, format?: string): Promise<void> {
    this._archivePath = source;
    this._currentFormat = format || this.detectFormatFromPath(source);

    // In a real implementation, would call native module
    // await this._nativeModule.openArchive(source, this._currentFormat);

    // Placeholder implementation
    console.warn('IOSArchiver: Native implementation required');
    this.currentEntries = [];
    this.currentEntryIndex = 0;
  }

  async getNextEntry(): Promise<ArchiveEntry | null> {
    // In a real implementation, would call native module
    // const nextEntry = await this._nativeModule.getNextEntry();

    // Placeholder implementation
    if (this.currentEntryIndex >= this.currentEntries.length) {
      return null;
    }

    const entry = this.currentEntries[this.currentEntryIndex++];
    return entry || null;
  }

  async extractEntry(entry: ArchiveEntry, destination: string): Promise<void> {
    // In a real implementation, would call native module
    // await this._nativeModule.extractEntry(entry.name, destination);

    // Placeholder implementation
    console.warn('IOSArchiver: Would extract', entry.name, 'to', destination);
  }

  async close(): Promise<void> {
    // In a real implementation, would call native module
    // await this._nativeModule.closeArchive();

    this._archivePath = null;
    this.currentEntries = [];
    this.currentEntryIndex = 0;
  }

  async create(destination: string, format: string): Promise<void> {
    this._destinationPath = destination;
    this._currentFormat = format;

    // In a real implementation, would call native module
    // await this._nativeModule.createArchive(destination, format);

    console.warn(
      'IOSArchiver: Would create',
      format,
      'archive at',
      destination
    );
  }

  async addEntry(entry: ArchiveEntry): Promise<void> {
    // In a real implementation, would call native module
    // If entry is file:
    // await this._nativeModule.addFileEntry(entry.name, entry.data);
    // If entry is directory:
    // await this._nativeModule.addDirectoryEntry(entry.name);

    console.warn('IOSArchiver: Would add entry', entry.name);
  }

  async finalize(): Promise<void> {
    // In a real implementation, would call native module
    // await this._nativeModule.finalizeArchive();

    console.warn('IOSArchiver: Would finalize archive');
  }

  async supportedFormats(): Promise<string[]> {
    // In a real implementation, would call native module
    // return await this._nativeModule.getSupportedFormats();

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
