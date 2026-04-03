declare module 'llama-tokenizer-js' {
  const llamaTokenizer: {
    decode(tokens: number[]): string;
  };

  export default llamaTokenizer;
}
