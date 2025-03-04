 /**
 * @siteed/expo-audio-stream
 * 
 * DEPRECATED: This package has been renamed to @siteed/expo-audio-studio
 * This file serves as a compatibility wrapper that re-exports everything from the new package.
 * 
 * Please update your imports to use @siteed/expo-audio-studio directly.
 */

import * as ExpoAudioStudio from '@siteed/expo-audio-studio';

// Display deprecation warning
console.warn(
  '@siteed/expo-audio-stream is deprecated and will be removed in a future version. ' +
  'Please migrate to @siteed/expo-audio-studio, which provides the same functionality with additional features.'
);

// Re-export everything from the new package
export * from '@siteed/expo-audio-studio';

// For backward compatibility with default imports
export default ExpoAudioStudio;