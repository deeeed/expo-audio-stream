export const int16ToFloat32 = (input: Int16Array): Float32Array => {
  const output = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    output[i] = input[i] / 32768;
  }
  return output;
};

export const int8ToFloat32 = (input: Int8Array): Float32Array => {
  const output = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    output[i] = input[i] / 128;
  }
  return output;
};

// Helper method to generate a UUID
export const quickUUID = () => {
  // Implementation of UUID generation (use a library or custom method)
  return "xxxx-xxxx-xxxx-xxxx".replace(/[x]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
