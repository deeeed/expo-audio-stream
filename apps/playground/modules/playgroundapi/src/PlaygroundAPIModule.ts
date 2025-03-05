import { NativeModule, requireNativeModule } from 'expo';

import { PlaygroundAPIModuleEvents } from './PlaygroundAPI.types';

declare class PlaygroundAPIModule extends NativeModule<PlaygroundAPIModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<PlaygroundAPIModule>('PlaygroundAPI');
