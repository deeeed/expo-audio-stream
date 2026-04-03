#ifndef SITEED_MOONSHINE_IOS_MOONSHINE_C_API_H
#define SITEED_MOONSHINE_IOS_MOONSHINE_C_API_H

/*
 Keep the bridge compiling against the exact C API header that ships with the
 bundled xcframework. The header content is architecture-independent, so we
 resolve through one shipped slice instead of depending on the vendored source
 checkout at pod build time.
 */
#include "../prebuilt/ios/Moonshine.xcframework/ios-arm64/Headers/moonshine-c-api.h"

#endif
