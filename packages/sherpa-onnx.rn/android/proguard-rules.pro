# Keep sherpa-onnx JNI classes
-keep class com.k2fsa.sherpa.onnx.** { *; }

# Keep React Native related code
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip

-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keep @com.facebook.common.internal.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
}

-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
  void set*(***);
  *** get*();
}

# Keep JNI methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep native libraries
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep all classes in our namespace
-keep class net.siteed.sherpaonnx.** { *; }

# Keep Apache Commons Compress — used at runtime for tar.bz2 extraction.
# Without this, R8 renames these classes and Class.forName() in SherpaOnnxImpl
# throws ClassNotFoundException, causing isLibraryLoaded to be set to false
# even though the JNI .so loaded successfully.
-keep class org.apache.commons.compress.** { *; }