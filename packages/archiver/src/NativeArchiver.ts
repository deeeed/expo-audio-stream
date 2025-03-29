import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Legacy method (keeping for compatibility)
  multiply(a: number, b: number): number;

  // New archiver methods
  openArchive(path: string, format: string): Promise<boolean>;
  closeArchive(): Promise<boolean>;
  getNextEntryName(): Promise<string | null>;
  extractEntry(entryName: string, destination: string): Promise<boolean>;
  createArchive(path: string, format: string): Promise<boolean>;
  addFileEntry(name: string, sourcePath: string): Promise<boolean>;
  addDirectoryEntry(name: string): Promise<boolean>;
  finalizeArchive(): Promise<boolean>;
  getSupportedFormats(): Promise<string[]>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Archiver');
