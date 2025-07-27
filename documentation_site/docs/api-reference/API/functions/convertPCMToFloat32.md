[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / convertPCMToFloat32

# Function: convertPCMToFloat32()

> **convertPCMToFloat32**(`__namedParameters`): `Promise`\<\{ `max`: `number`; `min`: `number`; `pcmValues`: `Float32Array`; \}\>

Defined in: [src/utils/convertPCMToFloat32.ts:69](https://github.com/deeeed/expo-audio-stream/blob/c4291a82cc740b4d4790c69ae7e7cc07f1e8fb1a/packages/expo-audio-studio/src/utils/convertPCMToFloat32.ts#L69)

## Parameters

### \_\_namedParameters

#### bitDepth

`number`

#### buffer

`ArrayBuffer`

#### logger?

[`ConsoleLike`](../type-aliases/ConsoleLike.md)

#### skipWavHeader?

`boolean` = `false`

## Returns

`Promise`\<\{ `max`: `number`; `min`: `number`; `pcmValues`: `Float32Array`; \}\>
