import * as FileSystem from 'expo-file-system/legacy'
import { Platform } from 'react-native'

function toNativeUri(uri: string): string {
    if (uri.startsWith('http')) return uri
    if (uri.startsWith('file:///')) return uri
    if (uri.startsWith('file:/')) {
        const normalizedPath = uri.replace(/^file:\/*/, '/')
        return `file://${normalizedPath}`
    }
    if (uri.startsWith('file://')) return uri
    if (uri.startsWith('/')) return `file://${uri}`
    return `file:///${uri}`
}

export function toNativePath(uri: string): string {
    return uri.replace(/^file:\/*/, '/')
}

export async function readFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
    if (Platform.OS === 'web') {
        const response = await fetch(uri)
        if (!response.ok) {
            throw new Error(`Failed to fetch ${uri}: ${response.status}`)
        }
        return response.arrayBuffer()
    }

    const base64 = await FileSystem.readAsStringAsync(toNativeUri(uri), {
        encoding: FileSystem.EncodingType.Base64,
    })
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
    }
    return bytes.buffer
}
