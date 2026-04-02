const DEFAULT_SPACE_STRING = '▁';

type TokenCandidate = {
  bytes: Uint8Array;
  tokenId: number;
};

const textEncoder = new TextEncoder();

function bytesEqual(
  source: Uint8Array,
  offset: number,
  target: Uint8Array
): boolean {
  if (offset + target.length > source.length) {
    return false;
  }
  for (let index = 0; index < target.length; index += 1) {
    if (source[offset + index] !== target[index]) {
      return false;
    }
  }
  return true;
}

export class MoonshineWebBinTokenizer {
  public static async fromUrl(
    tokenizerUrl: string
  ): Promise<MoonshineWebBinTokenizer> {
    const response = await fetch(tokenizerUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch Moonshine tokenizer from ${tokenizerUrl} (${response.status})`
      );
    }
    return MoonshineWebBinTokenizer.fromArrayBuffer(await response.arrayBuffer());
  }

  public static fromArrayBuffer(
    tokenizerBuffer: ArrayBuffer
  ): MoonshineWebBinTokenizer {
    const tokenizerData = new Uint8Array(tokenizerBuffer);
    const tokensToBytes: Uint8Array[] = [];

    let offset = 0;
    while (offset < tokenizerData.length) {
      const firstByte = tokenizerData[offset] ?? 0;
      offset += 1;

      if (firstByte === 0) {
        tokensToBytes.push(new Uint8Array(0));
        continue;
      }

      let byteCount = firstByte;
      if (firstByte >= 128) {
        const secondByte = tokenizerData[offset] ?? 0;
        offset += 1;
        byteCount = secondByte * 128 + firstByte - 128;
      }

      const tokenBytes = tokenizerData.slice(offset, offset + byteCount);
      if (tokenBytes.length !== byteCount) {
        throw new Error('Moonshine tokenizer data is truncated');
      }
      tokensToBytes.push(tokenBytes);
      offset += byteCount;
    }

    if (tokensToBytes.length === 0) {
      throw new Error('Moonshine tokenizer contains no tokens');
    }

    return new MoonshineWebBinTokenizer(tokensToBytes);
  }

  private readonly tokensByFirstByte = new Map<number, TokenCandidate[]>();

  public constructor(
    tokensToBytes: Uint8Array[],
    private readonly spaceString = DEFAULT_SPACE_STRING
  ) {
    for (let tokenId = 0; tokenId < tokensToBytes.length; tokenId += 1) {
      const bytes = tokensToBytes[tokenId];
      if (!bytes || bytes.length === 0) {
        continue;
      }
      const firstByte = bytes[0];
      if (firstByte == null) {
        continue;
      }
      const candidates = this.tokensByFirstByte.get(firstByte) ?? [];
      candidates.push({ bytes, tokenId });
      this.tokensByFirstByte.set(firstByte, candidates);
    }

    for (const candidates of this.tokensByFirstByte.values()) {
      candidates.sort((left, right) => right.bytes.length - left.bytes.length);
    }
  }

  public textToTokens(text: string): number[] {
    const normalizedText = text.replace(/ /g, this.spaceString);
    const inputBytes = textEncoder.encode(normalizedText);
    const result: number[] = [];
    let offset = 0;

    while (offset < inputBytes.length) {
      const firstByte = inputBytes[offset];
      const candidates =
        firstByte == null ? undefined : this.tokensByFirstByte.get(firstByte);

      let matched: TokenCandidate | undefined;
      for (const candidate of candidates ?? []) {
        if (bytesEqual(inputBytes, offset, candidate.bytes)) {
          matched = candidate;
          break;
        }
      }

      if (!matched) {
        const remainingText = new TextDecoder().decode(inputBytes.slice(offset));
        throw new Error(
          `Moonshine tokenizer could not encode remaining text: ${remainingText}`
        );
      }

      result.push(matched.tokenId);
      offset += matched.bytes.length;
    }

    return result;
  }
}
