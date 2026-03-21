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

# Keep Apache Commons Compress classes used for tar.bz2 extraction.
# Only keep tar/bzip2/utils — NOT the optional codecs which reference missing
# optional deps (org.tukaani.xz, com.github.luben.zstd, asm) not on Android.
-keep class org.apache.commons.compress.archivers.tar.** { *; }
-keep class org.apache.commons.compress.compressors.bzip2.** { *; }
-keep class org.apache.commons.compress.compressors.CompressorStreamFactory { *; }
-keep class org.apache.commons.compress.utils.** { *; }
-dontwarn org.tukaani.xz.**
-dontwarn com.github.luben.zstd.**
-dontwarn org.objectweb.asm.**
-dontwarn org.apache.commons.compress.harmony.**
-dontwarn org.apache.commons.compress.compressors.zstandard.**
-dontwarn org.apache.commons.compress.compressors.lzma.**
-dontwarn org.apache.commons.compress.compressors.xz.**
-dontwarn org.apache.commons.compress.archivers.sevenz.**