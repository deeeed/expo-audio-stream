import { AudioFeatures } from '@siteed/expo-audio-stream'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { SpectralFeatures } from './SpectralFeatures'
import { TimeFeatures } from './TimeFeatures'
import { TonalFeatures } from './TonalFeatures'

const getStyles = () => StyleSheet.create({
    container: {
        gap: 16,
    },
})

interface FeatureViewerProps {
    features?: AudioFeatures
}

export function FeatureViewer({ features }: FeatureViewerProps) {
    const styles = getStyles()

    if (!features) return null

    return (
        <View style={styles.container}>          
            <TimeFeatures 
                energy={features.energy}
                rms={features.rms}
                zcr={features.zcr}
                tempo={features.tempo}
            />

            <SpectralFeatures 
                spectralCentroid={features.spectralCentroid}
                spectralFlatness={features.spectralFlatness}
                spectralRolloff={features.spectralRolloff}
                spectralBandwidth={features.spectralBandwidth}
                hnr={features.hnr}
            />

            <TonalFeatures 
                chromagram={features.chromagram}
                pitch={features.pitch}
                tonnetz={features.tonnetz}
            />
        </View>
    )
} 