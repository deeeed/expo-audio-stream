/**
 * WasmWorkerManager — generic worker lifecycle + message bridge
 * for offloading WASM inference to a Web Worker.
 *
 * All managers share a single Worker (and therefore a single WASM
 * instance).  The worker routes messages by `feature` field, so
 * multiple features can coexist concurrently.  The shared Worker
 * is ref-counted and terminated when the last manager is released.
 */

import { getSherpaOnnxConfig } from '../wasmLoader';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

// ---------------------------------------------------------------------------
// Module-level shared Worker (singleton, ref-counted)
// ---------------------------------------------------------------------------

let sharedWorker: Worker | null = null;
let sharedRefCount = 0;
let sharedWasmBasePath: string | null = null;
const featureListeners = new Map<string, (msg: any) => void>();

function acquireWorker(wasmBasePath: string): Worker {
  if (!sharedWorker) {
    sharedWorker = new Worker(wasmBasePath + 'sherpa-worker.js');
    sharedWasmBasePath = wasmBasePath;
    sharedWorker.addEventListener('message', (e: MessageEvent) => {
      const feature = e.data?.feature;
      if (feature) featureListeners.get(feature)?.(e.data);
    });
    sharedWorker.addEventListener('error', (err: ErrorEvent) => {
      const errorMsg = {
        type: 'worker-error',
        error: err.message || 'Worker error',
      };
      for (const fn of featureListeners.values()) {
        fn(errorMsg);
      }
    });
  } else if (sharedWasmBasePath && wasmBasePath !== sharedWasmBasePath) {
    console.warn(
      `[WasmWorkerManager] wasmBasePath mismatch: existing="${sharedWasmBasePath}", requested="${wasmBasePath}". Reusing existing worker.`
    );
  }
  sharedRefCount++;
  return sharedWorker;
}

function releaseWorker(feature: string): void {
  featureListeners.delete(feature);
  sharedRefCount--;
  if (sharedRefCount <= 0) {
    sharedWorker?.terminate();
    sharedWorker = null;
    sharedRefCount = 0;
    sharedWasmBasePath = null;
  }
}

// ---------------------------------------------------------------------------
// WasmWorkerManager
// ---------------------------------------------------------------------------

export class WasmWorkerManager {
  private pending = new Map<string, PendingRequest>();
  private feature: string;
  private nextId = 0;
  private initialized = false;
  private _cleaned = false;
  private _initResolve: ((result: any) => void) | null = null;
  private _initReject: ((error: Error) => void) | null = null;
  private _releaseResolve: (() => void) | null = null;

  constructor(feature: string) {
    this.feature = feature;
  }

  /** True if the browser supports Web Workers. */
  static isAvailable(): boolean {
    return typeof Worker !== 'undefined';
  }

  /** True if workers are available AND not disabled via config. */
  static shouldUse(): boolean {
    return (
      getSherpaOnnxConfig().useWorker !== false &&
      typeof Worker !== 'undefined'
    );
  }

  async init(
    wasmBasePath: string,
    config: Record<string, unknown>
  ): Promise<any> {
    const worker = acquireWorker(wasmBasePath);

    return new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this._initResolve = null;
        this._initReject = null;
        this._cleanup();
        reject(new Error(`Worker init timeout for ${this.feature} (60s)`));
      }, 60_000);

      this._initResolve = (result: any) => {
        clearTimeout(timeout);
        this._initResolve = null;
        this._initReject = null;
        this.initialized = true;
        this._cleaned = false;
        resolve(result);
      };

      this._initReject = (error: Error) => {
        clearTimeout(timeout);
        this._initResolve = null;
        this._initReject = null;
        this._cleanup();
        reject(error);
      };

      featureListeners.set(this.feature, this._onMessage);

      worker.postMessage({
        type: 'init',
        feature: this.feature,
        wasmBasePath,
        config,
      });
    });
  }

  async process(
    payload: Record<string, unknown>,
    transferables?: Transferable[],
    timeoutMs = 120_000
  ): Promise<any> {
    if (!sharedWorker || !this.initialized) {
      throw new Error(`Worker not initialized for ${this.feature}`);
    }

    const requestId = String(this.nextId++);

    return new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        const pending = this.pending.get(requestId);
        if (pending) {
          this.pending.delete(requestId);
          pending.reject(
            new Error(`Worker process timeout for ${this.feature} (${timeoutMs}ms)`)
          );
        }
      }, timeoutMs);

      this.pending.set(requestId, {
        resolve: (value: any) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (reason: any) => {
          clearTimeout(timer);
          reject(reason);
        },
      });

      sharedWorker!.postMessage(
        {
          type: 'process',
          feature: this.feature,
          requestId,
          payload,
        },
        transferables ?? []
      );
    });
  }

  async release(): Promise<void> {
    if (!sharedWorker || !this.initialized) return;

    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        this._releaseResolve = null;
        this._cleanup();
        resolve();
      }, 5_000);

      this._releaseResolve = () => {
        clearTimeout(timeout);
        this._releaseResolve = null;
        this._cleanup();
        resolve();
      };

      sharedWorker!.postMessage({ type: 'release', feature: this.feature });
    });
  }

  dispose(): void {
    this._cleanup();
  }

  private _cleanup(): void {
    if (this._cleaned) return;
    this._cleaned = true;
    for (const [, { reject }] of this.pending) {
      reject(new Error('Worker disposed'));
    }
    this.pending.clear();
    this.initialized = false;
    releaseWorker(this.feature);
  }

  private _onMessage = (msg: any): void => {
    switch (msg.type) {
      case 'init-complete':
        this._initResolve?.(msg.result);
        break;

      case 'init-error':
        this._initReject?.(new Error(msg.error));
        break;

      case 'worker-error':
        if (this._initReject) {
          this._initReject(new Error(msg.error || 'Worker error'));
        }
        for (const [, { reject }] of this.pending) {
          reject(new Error(msg.error || 'Worker error'));
        }
        this.pending.clear();
        break;

      case 'result':
        if (msg.requestId != null) {
          const pending = this.pending.get(msg.requestId);
          if (pending) {
            this.pending.delete(msg.requestId);
            pending.resolve(msg.result);
          }
        }
        break;

      case 'process-error':
        if (msg.requestId != null) {
          const pending = this.pending.get(msg.requestId);
          if (pending) {
            this.pending.delete(msg.requestId);
            pending.reject(new Error(msg.error));
          }
        }
        break;

      case 'released':
        this._releaseResolve?.();
        break;
    }
  };
}
