import type { SherpaOnnxNamespace } from './wasmTypes';

// Read version from package.json.  Relative path differs between source (src/web/)
// and compiled output (lib/*/web/), so try both depths.
let WASM_VERSION = '0.0.0';
try {
  // Works from lib/module/web/ and lib/commonjs/web/ (3 dirs up)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WASM_VERSION = require('../../../package.json').version;
} catch {
  try {
    // Works from src/web/ (2 dirs up) — used by Metro web bundler
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    WASM_VERSION = require('../../package.json').version;
  } catch {
    // Fallback — CDN will use "latest" tag equivalent
  }
}

// ---------------------------------------------------------------------------
// Global configuration
// ---------------------------------------------------------------------------

/** Default CDN for the WASM runtime — jsDelivr serves files from the npm tarball. */
const DEFAULT_WASM_CDN =
  `https://cdn.jsdelivr.net/npm/@siteed/sherpa-onnx.rn@${WASM_VERSION}/wasm/`;

export interface SherpaOnnxConfig {
  /** Base URL for WASM runtime files (JS glue + .wasm binary + feature modules).
   *  Must end with '/'. Can be a local path or remote URL (e.g. CDN, HuggingFace).
   *  If not set, auto-detects from the Expo bundle script tag or falls back to jsDelivr CDN. */
  wasmBasePath?: string;
}

let _globalConfig: SherpaOnnxConfig = {};

/** Configure global settings for @siteed/sherpa-onnx.rn.
 *  Call this before any WASM-dependent API (e.g. validateLibraryLoaded, ASR, TTS).
 *  @example
 *  configureSherpaOnnx({ wasmBasePath: '/my-local-wasm/' });
 */
export function configureSherpaOnnx(config: SherpaOnnxConfig): void {
  _globalConfig = { ..._globalConfig, ...config };
}

export function getSherpaOnnxConfig(): Readonly<SherpaOnnxConfig> {
  return _globalConfig;
}

// ---------------------------------------------------------------------------
// Legacy WASM loader (used by main-sherpa-demo.ts to set modulePaths)
// ---------------------------------------------------------------------------

export interface WasmLoadOptions {
  mainScriptUrl?: string;
  modulePaths?: string[];
  debug?: boolean;
}

/** Detect the WASM base path from global config, Expo bundle script tag, or CDN. */
function detectWasmBasePath(): string {
  // 1. Explicit config takes priority
  if (_globalConfig.wasmBasePath) return _globalConfig.wasmBasePath;
  // 2. Auto-detect from Expo bundle (local dev / production with local wasm files)
  if (typeof document !== 'undefined') {
    const scriptEl = document.querySelector<HTMLScriptElement>(
      'script[src*="_expo/static"]'
    );
    if (scriptEl?.src) {
      try {
        const url = new URL(scriptEl.src);
        const idx = url.pathname.indexOf('_expo/static');
        if (idx > 0) return url.pathname.substring(0, idx) + 'wasm/';
      } catch { /* fall through */ }
    }
  }
  // 3. Default to CDN — works zero-config for external consumers
  return DEFAULT_WASM_CDN;
}

let _legacyLoaded = false;
let _legacyLoading = false;
let _legacyCallbacks: ((loaded: boolean) => void)[] = [];

function notifyLegacyReady(loaded: boolean): void {
  _legacyCallbacks.forEach((cb) => {
    try {
      cb(loaded);
    } catch (_e) {
      /* ignore */
    }
  });
  _legacyCallbacks = [];
}

/**
 * Legacy loader: sets window.sherpaOnnxModulePaths so sherpa-onnx-combined.js
 * loads only the requested feature modules. Called from main-sherpa-demo.ts.
 */
export const loadWasmModule = async (
  options?: WasmLoadOptions
): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  if (_legacyLoaded) return true;
  if (_legacyLoading) {
    return new Promise<boolean>((resolve) => {
      _legacyCallbacks.push(resolve);
    });
  }
  _legacyLoading = true;

  try {
    if ((window as any).SherpaOnnx) {
      _legacyLoaded = true;
      _legacyLoading = false;
      notifyLegacyReady(true);
      return true;
    }

    if (options?.modulePaths?.length) {
      (window as any).sherpaOnnxModulePaths = options.modulePaths;
    }

    // Load the WASM binary glue first — this creates window.Module
    // (the Emscripten runtime). Must be loaded before the orchestrator
    // script which depends on Module being present.
    const wasmBase = detectWasmBasePath();
    await loadScriptTag(wasmBase + 'sherpa-onnx-wasm-combined.js');

    return new Promise<boolean>((resolve) => {
      (window as any).onSherpaOnnxReady = (loaded: boolean) => {
        _legacyLoaded = loaded;
        _legacyLoading = false;
        notifyLegacyReady(loaded);
        resolve(loaded);
      };

      const script = document.createElement('script');
      script.src = options?.mainScriptUrl || (detectWasmBasePath() + 'sherpa-onnx-combined.js');
      script.async = true;
      script.onerror = () => {
        _legacyLoading = false;
        notifyLegacyReady(false);
        resolve(false);
      };
      document.head.appendChild(script);

      setTimeout(() => {
        if (_legacyLoading) {
          _legacyLoading = false;
          const loaded = !!(window as any).SherpaOnnx;
          notifyLegacyReady(loaded);
          resolve(loaded);
        }
      }, 15000);
    });
  } catch (error) {
    _legacyLoading = false;
    notifyLegacyReady(false);
    return false;
  }
};

// ---------------------------------------------------------------------------
// Script loader
// ---------------------------------------------------------------------------

export function loadScriptTag(url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Check if already loaded
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${url}"]`
    );
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.async = false; // sequential loading required
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}

// ---------------------------------------------------------------------------
// Combined WASM loader (idempotent)
// ---------------------------------------------------------------------------

/** Return true if the WASM runtime and all feature JS modules are ready. */
export function isSherpaOnnxReady(): boolean {
  return !!(
    window.Module &&
    window.Module.calledRun &&
    window.Module.FS &&
    window.SherpaOnnx &&
    window.SherpaOnnx.VAD &&
    window.SherpaOnnx.ASR &&
    window.SherpaOnnx.TTS &&
    window.SherpaOnnx.KWS
  );
}

export async function loadCombinedWasm(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('WASM modules can only be loaded in a browser environment');
  }

  // Already confirmed loaded
  if (window._sherpaOnnxCombinedLoaded) return;

  // Fast-path: WASM + all feature modules are already present (e.g. page
  // reloaded the scripts but our flag was lost, or loading completed before
  // the timeout in a prior call).
  if (isSherpaOnnxReady()) {
    window._sherpaOnnxCombinedLoaded = true;
    return;
  }

  // If a load is in progress, wait for it — but if it already rejected (e.g.
  // due to a prior timeout) and the runtime is now ready, clear the stale
  // promise so we can re-enter.
  if (window._sherpaOnnxLoadingPromise) {
    try {
      return await window._sherpaOnnxLoadingPromise;
    } catch {
      // Prior attempt failed; if the runtime is now ready accept it.
      if (isSherpaOnnxReady()) {
        window._sherpaOnnxCombinedLoaded = true;
        window._sherpaOnnxLoadingPromise = undefined;
        return;
      }
      // Otherwise clear the stale promise and retry below.
      window._sherpaOnnxLoadingPromise = undefined;
    }
  }

  const promise = (async () => {
    // 1. Load the combined WASM binary + JS glue.
    //    This sets up window.Module (the Emscripten module object).
    const wasmBase = detectWasmBasePath();
    await loadScriptTag(wasmBase + 'sherpa-onnx-wasm-combined.js');

    // 2. Hook Module.onRuntimeInitialized so we know when the WASM binary
    //    finishes compiling.  We do this AFTER loading the glue JS (which
    //    creates window.Module) but BEFORE loading sherpa-onnx-combined.js
    //    (which may also hook it — we preserve the chain).
    const readyPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pollCancelled = true;
        if (isSherpaOnnxReady()) resolve();
        else reject(new Error('Sherpa ONNX WASM loading timeout (180s)'));
      }, 180_000);

      // If Module.FS is already available the WASM already finished compiling
      // (e.g. cached, instantaneous — just poll to let feature modules load).
      let pollCancelled = false;
      const pollReady = () => {
        if (pollCancelled) return;
        if (isSherpaOnnxReady()) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(pollReady, 300);
        }
      };

      if (window.Module && window.Module.FS) {
        // WASM binary already compiled; just wait for feature modules.
        pollReady();
      } else if (window.Module) {
        // Glue JS loaded, binary still compiling — wrap onRuntimeInitialized.
        const prev = window.Module.onRuntimeInitialized;
        window.Module.onRuntimeInitialized = () => {
          if (prev) prev();
          // Feature modules may need a tick to finish loading after runtime init.
          pollReady();
        };
      } else {
        // Should not happen after step 1, but fall back to polling.
        pollReady();
      }

      // Also accept the onSherpaOnnxReady callback fired by
      // sherpa-onnx-combined.js (for the case where it loaded first).
      window.onSherpaOnnxReady = (success: boolean) => {
        pollCancelled = true;
        clearTimeout(timeout);
        if (success) resolve();
        else if (isSherpaOnnxReady())
          resolve(); // partial load still OK
        else reject(new Error('Sherpa ONNX feature modules failed to load'));
      };
    });

    // 3. Load the combined module orchestrator which:
    //    - Hooks into Module.onRuntimeInitialized
    //    - Loads feature JS modules (core, vad, asr, tts, kws, etc.)
    //    - Calls window.onSherpaOnnxReady when done
    await loadScriptTag(wasmBase + 'sherpa-onnx-combined.js');

    // 5. Wait for WASM runtime init + all feature modules ready
    await readyPromise;

    window._sherpaOnnxCombinedLoaded = true;
  })();

  window._sherpaOnnxLoadingPromise = promise;
  return promise;
}

/** Convenience accessor — only valid after loadCombinedWasm() resolves. */
export function getSherpaOnnx(): SherpaOnnxNamespace {
  return window.SherpaOnnx;
}
