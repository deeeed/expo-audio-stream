import type { ArchiveEntry, ArchiveHandler } from '../index';

/**
 * WebArchiver - Placeholder Implementation
 *
 * This is a placeholder implementation that will be replaced with actual functionality.
 * Currently removing all web dependencies for compatibility.
 */
export default class WebArchiver implements ArchiveHandler {
  private format: string | null = null;
  private entries: Array<ArchiveEntry> = [];
  private currentEntryIndex: number = 0;
  private destination: string | null = null;

  async open(source: string, format?: string): Promise<void> {
    // Placeholder implementation
    console.warn(
      'WebArchiver.open() is a placeholder and does not yet have a full implementation'
    );
    this.format = format || this.detectFormatFromPath(source);
    this.entries = [];
    this.currentEntryIndex = 0;
  }

  async getNextEntry(): Promise<ArchiveEntry | null> {
    // Placeholder implementation
    console.warn(
      'WebArchiver.getNextEntry() is a placeholder and does not yet have a full implementation'
    );
    if (
      this.entries.length > 0 &&
      this.currentEntryIndex < this.entries.length
    ) {
      return this.entries[this.currentEntryIndex++] || null;
    }
    return null;
  }

  async extractEntry(entry: ArchiveEntry, destination: string): Promise<void> {
    // Placeholder implementation
    console.warn(
      'WebArchiver.extractEntry() is a placeholder and does not yet have a full implementation'
    );
    // No-op placeholder
  }

  async close(): Promise<void> {
    // Placeholder implementation
    console.warn(
      'WebArchiver.close() is a placeholder and does not yet have a full implementation'
    );
    this.entries = [];
    this.currentEntryIndex = 0;
    this.format = null;
    this.destination = null;
  }

  async create(destination: string, format: string): Promise<void> {
    // Placeholder implementation
    console.warn(
      'WebArchiver.create() is a placeholder and does not yet have a full implementation'
    );
    this.format = format;
    this.destination = destination;
  }

  async addEntry(entry: ArchiveEntry): Promise<void> {
    // Placeholder implementation
    console.warn(
      'WebArchiver.addEntry() is a placeholder and does not yet have a full implementation'
    );
    // No-op placeholder
  }

  async finalize(): Promise<void> {
    // Placeholder implementation
    console.warn(
      'WebArchiver.finalize() is a placeholder and does not yet have a full implementation'
    );
    await this.close();
  }

  async supportedFormats(): Promise<string[]> {
    return ['zip', 'tar'];
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
