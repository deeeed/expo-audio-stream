# Audio Playground

Playground for cross platform audio streaming and feature extractions using **@siteed/expo-audio-stream**.

## Try it right away

https://deeeed.github.io/expo-audio-stream/


## To run on device directly from android or ios

Everytime we run `expo prebuild --clean` it prevents launching the app directly from Android Studio or XCode if we use custom port. 


## First run port custom script
```bash
./setPort.sh
```

## Android
Even after customPort still need to reverse tcp `adb reverse tcp:7365 tcp:7365`.


```
apps/playground/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/AgpConfiguratorUtils.kt
const val DEFAULT_DEV_SERVER_PORT = "8081"
```

On IOS after cleanup it always reset port on file:
RCTInspectorDevServerHelper.mm:26
NSNumber *port = @7365;

It looks for RCT_METRO_PORT
apps/playground/ios/Pods/Headers/Private/React-Core/React/RCTDefines.h
apps/playground/ios/Pods/Headers/Public/React-Core/React/RCTDefines.h



### Gradle Issues 
https://github.com/expo/expo/issues/31005
