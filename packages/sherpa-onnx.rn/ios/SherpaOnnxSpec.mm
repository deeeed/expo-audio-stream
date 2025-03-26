#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTLog.h>
#import <React/RCTUtils.h>

/**
 * This file contains the implementation details for TurboModules and Fabric rendering.
 * The RN codegen system would typically generate this code, but for quick testing
 * we're implementing it directly.
 */

namespace facebook {
namespace react {

/**
 * TurboModule implementation for the SherpaOnnx module
 */
class NativeSherpaOnnxSpecJSI : public ObjCTurboModule {
public:
  NativeSherpaOnnxSpecJSI(const ObjCTurboModule::InitParams &params)
      : ObjCTurboModule(params) {}
};

} // namespace react
} // namespace facebook

#endif // RCT_NEW_ARCH_ENABLED 