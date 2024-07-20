---
id: adding-event-listener
title: Adding Event Listener
sidebar_label: Adding Event Listener
---

# Adding Event Listener

You can also add an event listener to receive detailed audio event payloads, which is crucial for both standalone and shared usage scenarios.


```tsx
import { useEffect } from 'react'
import { addAudioEventListener } from '@siteed/expo-audio-stream'

function App() {
    useEffect(() => {
        const subscription = addAudioEventListener((event) => {
            console.log('Audio event received:', event)
        })

        return () => subscription.remove()
    }, [])

    // UI code here
}
```

---

Next, explore the [API Reference](api/) to understand the different data structures and configurations available.

