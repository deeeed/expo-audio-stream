[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / convertPCMToFloat32

# Function: convertPCMToFloat32()

> **convertPCMToFloat32**(`__namedParameters`): `Promise`\<\{ `max`: `number`; `min`: `number`; `pcmValues`: `Float32Array`; \}\>

## Parameters

### \_\_namedParameters

#### bitDepth

`number`

#### buffer

`ArrayBuffer`

#### logger

[`ConsoleLike`](../type-aliases/ConsoleLike.md)

#### skipWavHeader

`boolean` = `false`

## Returns

`Promise`\<\{ `max`: `number`; `min`: `number`; `pcmValues`: `Float32Array`; \}\>

## Defined in

[src/utils/convertPCMToFloat32.ts:69](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/utils/convertPCMToFloat32.ts#L69)
