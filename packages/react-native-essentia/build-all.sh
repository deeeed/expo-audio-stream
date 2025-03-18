#!/bin/bash
set -e

echo "==== Building Essentia for all platforms ===="

# Add a --force flag to rebuild everything from scratch
FORCE_FLAG="$1"

echo "==== Building for iOS ===="
./build-essentia-ios.sh $FORCE_FLAG

echo "==== Building for Android arm64-v8a ===="
ANDROID_ABI=arm64-v8a ./build-essentia-android.sh $FORCE_FLAG

echo "==== Building for Android armeabi-v7a ===="
ANDROID_ABI=armeabi-v7a ./build-essentia-android.sh $FORCE_FLAG

echo "==== Building for Android x86 ===="
ANDROID_ABI=x86 ./build-essentia-android.sh $FORCE_FLAG

echo "==== Building for Android x86_64 ===="
ANDROID_ABI=x86_64 ./build-essentia-android.sh $FORCE_FLAG

echo "==== All builds completed successfully! ===="
