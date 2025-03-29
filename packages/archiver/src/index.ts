import { Platform } from 'react-native';

// Represents a single entry in an archive (file or directory)
export interface ArchiveEntry {
  name: string; // e.g., "file.txt" or "folder/"
  isDirectory: boolean; // True if entry is a directory
  size?: number; // Size in bytes (optional for directories)
  data?: ArrayBuffer | ArrayBufferLike; // Binary data for files (optional until extracted)
}

// Main interface for archive operations
export interface ArchiveHandler {
  /**
   * Opens an existing archive file
   * @param source Path or URL to the archive (e.g., "path/to/archive.zip")
   * @param format Optional format hint (e.g., "zip", "tar", "tar.bz2")
   */
  open(source: string, format?: string): Promise<void>;

  /**
   * Retrieves the next entry in the archive (for iteration)
   * @returns The next ArchiveEntry or null if no more entries
   */
  getNextEntry(): Promise<ArchiveEntry | null>;

  /**
   * Extracts a specific entry to a destination
   * @param entry The entry to extract
   * @param destination Path where the entry will be extracted
   */
  extractEntry(entry: ArchiveEntry, destination: string): Promise<void>;

  /**
   * Closes the archive and releases resources
   */
  close(): Promise<void>;

  /**
   * Creates a new archive at the specified destination
   * @param destination Path for the new archive (e.g., "path/to/new.zip")
   * @param format Archive format (e.g., "zip", "tar", "tar.bz2")
   */
  create(destination: string, format: string): Promise<void>;

  /**
   * Adds an entry to the archive being created
   * @param entry The entry to add (must include data if it's a file)
   */
  addEntry(entry: ArchiveEntry): Promise<void>;

  /**
   * Finalizes the archive creation process
   */
  finalize(): Promise<void>;

  /**
   * Returns supported archive formats for the current platform
   * @returns Array of supported formats (e.g., ["zip", "tar"])
   */
  supportedFormats(): Promise<string[]>;
}

// Import platform-specific implementations
import WebArchiver from './web/WebArchiver';
import AndroidArchiver from './android/AndroidArchiver';
import IOSArchiver from './ios/IOSArchiver';

// Main class implementing the interface with platform-specific logic
export class Archiver implements ArchiveHandler {
  private implementation: ArchiveHandler;

  constructor() {
    // Select the appropriate implementation based on platform
    if (Platform.OS === 'web') {
      this.implementation = new WebArchiver();
    } else if (Platform.OS === 'android') {
      this.implementation = new AndroidArchiver();
    } else if (Platform.OS === 'ios') {
      this.implementation = new IOSArchiver();
    } else {
      // Fallback to web implementation for unknown platforms
      this.implementation = new WebArchiver();
    }
  }

  async open(source: string, format?: string): Promise<void> {
    return this.implementation.open(source, format);
  }

  async getNextEntry(): Promise<ArchiveEntry | null> {
    return this.implementation.getNextEntry();
  }

  async extractEntry(entry: ArchiveEntry, destination: string): Promise<void> {
    return this.implementation.extractEntry(entry, destination);
  }

  async close(): Promise<void> {
    return this.implementation.close();
  }

  async create(destination: string, format: string): Promise<void> {
    return this.implementation.create(destination, format);
  }

  async addEntry(entry: ArchiveEntry): Promise<void> {
    return this.implementation.addEntry(entry);
  }

  async finalize(): Promise<void> {
    return this.implementation.finalize();
  }

  async supportedFormats(): Promise<string[]> {
    return this.implementation.supportedFormats();
  }
}

// Export instance for convenient use
export const archiver = new Archiver();
