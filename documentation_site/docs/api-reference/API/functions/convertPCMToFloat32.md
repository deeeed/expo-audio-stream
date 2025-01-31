[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / convertPCMToFloat32

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

[src/utils/convertPCMToFloat32.ts:69](https://github.com/deeeed/expo-audio-stream/blob/f331673c63a1455c43da58e2ce3d990dd3519dae/packages/expo-audio-stream/src/utils/convertPCMToFloat32.ts#L69)
