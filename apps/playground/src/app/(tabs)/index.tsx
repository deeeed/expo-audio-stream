import { Redirect, useLocalSearchParams } from 'expo-router'

export default function Index() {
    const params = useLocalSearchParams()

    return (
        <Redirect
            href={{
                pathname: '/record',
                params,
            }}
        />
    )
}
