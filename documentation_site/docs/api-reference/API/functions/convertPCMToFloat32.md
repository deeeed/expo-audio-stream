[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / convertPCMToFloat32

# Function: convertPCMToFloat32()

> **convertPCMToFloat32**(`__namedParameters`): `Promise`\<\{ `max`: `number`; `min`: `number`; `pcmValues`: `Float32Array`; \}\>

Defined in: [src/utils/convertPCMToFloat32.ts:69](https://github.com/deeeed/expo-audio-stream/blob/02ffb8ddbf4c4c6d08b7c13479558a436c0e02e4/packages/expo-audio-studio/src/utils/convertPCMToFloat32.ts#L69)

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
