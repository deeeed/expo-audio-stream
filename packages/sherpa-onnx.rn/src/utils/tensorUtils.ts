import type { OnnxTensorData } from '../types/interfaces';

export type TypedTensorData =
  | Float32Array
  | Float64Array
  | BigInt64Array
  | Int32Array
  | Int8Array
  | Uint8Array;

const BYTES_PER_ELEMENT: Record<OnnxTensorData['type'], number> = {
  float32: 4,
  float64: 8,
  int64: 8,
  int32: 4,
  int8: 1,
  uint8: 1,
  bool: 1,
};

// Base64 encode/decode using btoa/atob (available in Hermes and web).
function _encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function _decode(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function typedArrayToBase64(data: TypedTensorData): string {
  return _encode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
}

export function base64ToTypedArray(
  b64: string,
  type: OnnxTensorData['type']
): TypedTensorData {
  const bytes = _decode(b64);
  const ab = bytes.buffer;
  const off = bytes.byteOffset;
  const len = bytes.byteLength;

  switch (type) {
    case 'float32':
      return new Float32Array(ab, off, len / 4);
    case 'float64':
      return new Float64Array(ab, off, len / 8);
    case 'int64':
      return new BigInt64Array(ab, off, len / 8);
    case 'int32':
      return new Int32Array(ab, off, len / 4);
    case 'int8':
      return new Int8Array(ab, off, len);
    case 'uint8':
    case 'bool':
      return new Uint8Array(ab, off, len);
    default:
      return new Float32Array(ab, off, len / 4);
  }
}

export function createTensorData(
  type: OnnxTensorData['type'],
  data: TypedTensorData,
  dims: number[]
): OnnxTensorData {
  return { type, dims, data: typedArrayToBase64(data) };
}

export function parseTensorData(
  td: OnnxTensorData
): { type: OnnxTensorData['type']; data: TypedTensorData; dims: number[] } {
  return {
    type: td.type,
    data: base64ToTypedArray(td.data, td.type),
    dims: td.dims,
  };
}

export { BYTES_PER_ELEMENT };
