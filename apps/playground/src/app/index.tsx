import { Redirect } from 'expo-router'

// This handles the root "/" path and redirects to the record screen
// We need this file because expo-router requires a handler for the root path
export default function Index() {
  // The most efficient way to handle the root path
  return <Redirect href="/record" />
} 