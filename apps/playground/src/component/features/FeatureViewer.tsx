import { AudioFeatures } from '@siteed/expo-audio-stream'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { MFCCFeatures } from './MFCCFeatures'
import { SpectralFeatures } from './SpectralFeatures'
import { TimeFeatures } from './TimeFeatures'
import { TonalFeatures } from './TonalFeatures'

const getStyles = () => StyleSheet.create({
    container: {
        gap: 16,
    },
    featureSection: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
})

interface FeatureViewerProps {
    features?: AudioFeatures
}

export function FeatureViewer({ features }: FeatureViewerProps) {
    if (!features) {
        return null
    }

    return (
        <View style={getStyles().container}>
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

            {features.mfcc && <MFCCFeatures mfcc={features.mfcc} />}

            <TonalFeatures 
                chromagram={features.chromagram}
                pitch={features.pitch}
                tonnetz={features.tonnetz}
            />
        </View>
    )
}