import * as FileSystem from 'expo-file-system/legacy'

import { toNativePath } from './fileUtils'

const moonshineIntentModelRoot =
    `${FileSystem.documentDirectory ?? ''}moonshine-intent-models/`

export interface MoonshineIntentModelStatus {
    downloaded: boolean
    localPath: string | null
    variant: string
}

export interface MoonshineIntentDownloadOptions {
    onStatus?: (message: string) => void
    variant?: string
}

function getIntentFiles(variant: string): string[] {
    if (variant === 'fp32') {
        return ['model.onnx', 'model.onnx_data', 'tokenizer.bin']
    }

    return [`model_${variant}.onnx`, `model_${variant}.onnx_data`, 'tokenizer.bin']
}

function getModelDirectoryUri(variant: string): string {
    return `${moonshineIntentModelRoot}embeddinggemma-300m/${variant}`
}

async function downloadToFile(
    url: string,
    targetPath: string,
    onStatus?: (message: string) => void
): Promise<void> {
    onStatus?.(`Downloading ${targetPath.split('/').pop()}...`)
    const resumable = FileSystem.createDownloadResumable(url, targetPath)
    const result = await resumable.downloadAsync()
    if (!result) {
        throw new Error(`Download failed for ${url}`)
    }
}

export async function getMoonshineIntentModelStatus(
    variant = 'q4'
): Promise<MoonshineIntentModelStatus> {
    const dirUri = getModelDirectoryUri(variant)
    const files = getIntentFiles(variant)
    const statuses = await Promise.all(
        files.map((fileName) => FileSystem.getInfoAsync(`${dirUri}/${fileName}`))
    )
    const downloaded = statuses.every((status) => status.exists)
    return {
        downloaded,
        localPath: downloaded ? toNativePath(dirUri) : null,
        variant,
    }
}

export async function prepareMoonshineIntentModel(
    options: MoonshineIntentDownloadOptions = {}
): Promise<MoonshineIntentModelStatus> {
    const variant = options.variant ?? 'q4'
    const dirUri = getModelDirectoryUri(variant)
    await FileSystem.makeDirectoryAsync(dirUri, {
        intermediates: true,
    }).catch(() => {})

    const baseUrl = 'https://download.moonshine.ai/model/embeddinggemma-300m'
    for (const fileName of getIntentFiles(variant)) {
        const targetPath = `${dirUri}/${fileName}`
        const existing = await FileSystem.getInfoAsync(targetPath)
        if (existing.exists) continue
        await downloadToFile(`${baseUrl}/${fileName}`, targetPath, options.onStatus)
    }

    return {
        downloaded: true,
        localPath: toNativePath(dirUri),
        variant,
    }
}
