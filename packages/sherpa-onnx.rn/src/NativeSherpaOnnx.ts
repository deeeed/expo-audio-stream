import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Test method to validate that the library is properly loaded
  validateLibraryLoaded(): Promise<{
    loaded: boolean;
    status: string;
  }>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('SherpaOnnx'); 