// Shim for expo-modules-core to allow bob build declaration generation.
// expo-file-system/legacy ships raw .ts that imports expo-modules-core,
// which isn't installed as a direct dependency of this package.
declare module 'expo-modules-core' {
  export const requireOptionalNativeModule: any;
  export type EventSubscription = any;
  export const UnavailabilityError: any;
  export const uuid: any;
  export class NativeModule<T = any> {}
}
