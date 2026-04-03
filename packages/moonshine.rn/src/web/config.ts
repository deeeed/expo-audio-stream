import type { MoonshineModelArch } from '../types/interfaces';

let PACKAGE_VERSION = '0.0.0';
let ONNX_RUNTIME_WEB_VERSION = '1.21.1';

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require('../../../package.json');
  PACKAGE_VERSION = pkg.version ?? PACKAGE_VERSION;
  ONNX_RUNTIME_WEB_VERSION =
    String(pkg.dependencies?.['onnxruntime-web'] ?? ONNX_RUNTIME_WEB_VERSION)
      .replace(/^[^\d]*/, '')
      .trim() || ONNX_RUNTIME_WEB_VERSION;
} catch {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../../package.json');
    PACKAGE_VERSION = pkg.version ?? PACKAGE_VERSION;
    ONNX_RUNTIME_WEB_VERSION =
      String(pkg.dependencies?.['onnxruntime-web'] ?? ONNX_RUNTIME_WEB_VERSION)
        .replace(/^[^\d]*/, '')
        .trim() || ONNX_RUNTIME_WEB_VERSION;
  } catch {
    // Fall through to defaults.
  }
}

const DEFAULT_WEB_MODEL_CDN = 'https://download.moonshine.ai/model/';
const DEFAULT_ORT_WASM_CDN =
  `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ONNX_RUNTIME_WEB_VERSION}/dist/`;

export interface MoonshineWebConfig {
  modelAssetBasePath?: string;
  onnxRuntimeWasmBasePath?: string;
}

let config: MoonshineWebConfig = {};

export function configureMoonshineWeb(nextConfig: MoonshineWebConfig): void {
  config = { ...config, ...nextConfig };
}

export function getMoonshineWebConfig(): Readonly<MoonshineWebConfig> {
  return config;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

export function detectMoonshineWebAssetBasePath(): string {
  if (config.modelAssetBasePath) {
    return ensureTrailingSlash(config.modelAssetBasePath);
  }
  return DEFAULT_WEB_MODEL_CDN;
}

export function detectMoonshineOnnxRuntimeWasmBasePath(): string {
  if (config.onnxRuntimeWasmBasePath) {
    return ensureTrailingSlash(config.onnxRuntimeWasmBasePath);
  }
  return DEFAULT_ORT_WASM_CDN;
}

export function normalizeMoonshineWebModelArch(
  modelArch: MoonshineModelArch | number
): 'tiny' | 'base' {
  if (typeof modelArch === 'number') {
    if (modelArch === 0) return 'tiny';
    if (modelArch === 1) return 'base';
    throw new Error(
      `Moonshine web currently supports only tiny/base offline models. Received model arch code: ${modelArch}`
    );
  }

  switch (modelArch) {
    case 'tiny':
    case 'tiny-streaming':
    case 'small-streaming':
      return 'tiny';
    case 'base':
    case 'base-streaming':
    case 'medium-streaming':
      return 'base';
    default:
      throw new Error(
        `Moonshine web currently supports tiny/base model tiers. Received model arch: ${modelArch}`
      );
  }
}

function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') {
    end -= 1;
  }
  return value.slice(0, end);
}

export function resolveMoonshineWebModelBasePath(
  candidatePath: string | undefined,
  modelArch: 'tiny' | 'base'
): string {
  if (candidatePath?.trim()) {
    return candidatePath.endsWith('/quantized')
      ? candidatePath.slice(0, -'/quantized'.length)
      : trimTrailingSlashes(candidatePath);
  }
  const assetBasePath = detectMoonshineWebAssetBasePath();
  return assetBasePath.endsWith('/model/')
    ? `${assetBasePath}${modelArch}`
    : `${assetBasePath}model/${modelArch}`;
}

export function getMoonshineWebRuntimeVersion(): number {
  const parts = PACKAGE_VERSION.split('.').map((part) => Number.parseInt(part, 10));
  const [major = 0, minor = 0, patch = 0] = parts;
  return major * 10000 + minor * 100 + patch;
}
