package com.rncpp

import com.facebook.react.bridge.ReactApplicationContext

abstract class RncppSpec internal constructor(context: ReactApplicationContext) :
  NativeRncppSpec(context) {
}
