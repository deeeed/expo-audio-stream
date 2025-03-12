import { NativeModule, requireNativeModule } from 'expo';

interface ValidationResult {
  success: boolean;
  message?: string;
  error?: string;
  essentiaModuleClassFound?: boolean;
  essentiaModuleClassName?: string;
  jniConnectionSuccessful?: boolean;
  jniTestResult?: string;
  validationSteps?: string[];
}

interface ModuleImportsCheckResult {
  success: boolean;
  audioProcessorImported?: boolean;
  audioProcessorClass?: string;
  audioProcessorError?: string;
  essentiaModuleImported?: boolean;
  essentiaModuleClass?: string;
  essentiaModuleError?: string;
  modules?: Array<{ name: string; exists: boolean }>;
  error?: string;
}

interface AudioProcessingResult {
  success: boolean;
  message?: string;
  error?: string;
  moduleAvailable?: boolean;
  durationMs?: number;
}

declare class PlaygroundAPIModule extends NativeModule {
  // Basic test
  hello(): string;
  
  // Essentia integration tests
  validateEssentiaIntegration(): Promise<ValidationResult>;
  testEssentiaVersion(): Promise<{ success: boolean; version?: string; error?: string }>;
  
  // Additional tests for demonstrating different module types
  validateAudioProcessorIntegration(): Promise<ValidationResult>;
  checkModuleImports(): Promise<ModuleImportsCheckResult>;
  processAudioWithModule(fileUri: string): Promise<AudioProcessingResult>;
}

export default requireNativeModule<PlaygroundAPIModule>('PlaygroundAPI');
