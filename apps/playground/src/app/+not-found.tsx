import { Link, Stack, usePathname, useSegments } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

export default function NotFoundScreen() {
    const pathname = usePathname()
    const segments = useSegments()

    return (
        <>
            <Stack.Screen options={{ title: 'Oops!' }} />
            <View style={styles.container}>
                <Text style={styles.title}>
                    This screen doesn&apos;t exist.
                </Text>
                <Text>path: {pathname}</Text>
                <Text>segments: {JSON.stringify(segments)}</Text>
                <Link href="/(tabs)/record" style={styles.link}>
                    <Text style={styles.linkText}>Go to home screen!</Text>
                </Link>
            </View>
        </>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    link: {
        marginTop: 15,
        paddingVertical: 15,
    },
    linkText: {
        fontSize: 14,
        color: '#2e78b7',
    },
})
