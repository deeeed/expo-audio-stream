# Audio Playground

Playground for cross platform audio streaming and feature extractions using **@siteed/expo-audio-stream**.

## Try it right away

https://deeeed.github.io/expo-audio-stream/


## To run on device directly from android or ios

Everytime we run `expo prebuild --clean` it prevents launching the app directly from Android Studio or XCode if we use custom port. We can simplfy do adb port forward on android `adb reverse tcp:8081 tcp:7365` and then run `expo start --tunnel` to run the app on device.
node_modules/@react-native/gradle-plugin/src/main/kotlin/com/facebook/react/utils/AgpConfiguratorUtils.kt

On IOS after cleanup it always reset port on file:
RCTInspectorDevServerHelper.mm:26
NSNumber *port = @7365;

It looks for RCT_METRO_PORT
apps/playground/ios/Pods/Headers/Private/React-Core/React/RCTDefines.h
apps/playground/ios/Pods/Headers/Public/React-Core/React/RCTDefines.h



### Gradle Issues 
https://github.com/expo/expo/issues/31005
