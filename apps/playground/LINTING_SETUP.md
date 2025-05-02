# Expo Audio Playground Linting Setup

This document provides basic linting guidelines for the project.

## Core Linting Rules

We've added several key TypeScript preferences to improve code quality:

1. **Nullish Coalescing Operator** (`??`) - A safer alternative to logical OR when dealing with null/undefined values
2. **Optional Chaining** (`?.`) - A cleaner way to access nested properties that might be null/undefined
3. **Unused Imports Removal** - Automatically removes unused imports to keep code clean

## Common Fix Examples

### Using Nullish Coalescing (`??`) Instead of Logical OR (`||`)

The logical OR operator (`||`) will substitute the right-side value for ANY falsy value (including `0`, `''`, `false`), which is often not what you want. The nullish coalescing operator (`??`) only substitutes when the left side is `null` or `undefined`.

```typescript
// ❌ AVOID: Using logical OR (returns right side for ANY falsy value - 0, '', false, etc.)
const value = someValue || defaultValue;

// ✅ BETTER: Using nullish coalescing (only substitutes for null/undefined)
const value = someValue ?? defaultValue;
```

### When to Use Nullish Coalescing vs Logical OR

- Use `??` when you want to provide a default only when the value is null/undefined
- Use `||` when you want to provide a default for any falsy value

Examples:

```typescript
// USE NULLISH COALESCING when preserving falsy values like 0 or empty string is important
const count = userCount ?? 0;  // only uses 0 if userCount is null/undefined
const message = userMessage ?? 'Default'; // keeps empty strings from userMessage

// USE LOGICAL OR when you want to treat all falsy values the same
const name = displayName || 'Anonymous'; // replaces empty strings with 'Anonymous'
```

### Using Optional Chaining (`?.`)

```typescript
// ❌ AVOID: Multiple condition checks
if (object && object.property && object.property.value) {
  // do something
}

// ✅ BETTER: Using optional chaining
if (object?.property?.value) {
  // do something
}
```

### Accessing Properties with Optional Chaining

```typescript
// ❌ AVOID:
const value = user && user.profile && user.profile.settings && user.profile.settings.theme;

// ✅ BETTER:
const value = user?.profile?.settings?.theme;
```

### Calling Methods with Optional Chaining

```typescript
// ❌ AVOID:
if (audio && audio.sound && audio.sound._loaded && audio.sound.getStatusAsync) {
  const status = await audio.sound.getStatusAsync();
}

// ✅ BETTER:
if (audio?.sound?._loaded && audio?.sound?.getStatusAsync) {
  const status = await audio?.sound.getStatusAsync();
}
```

### Managing Unused Imports

The project is configured to automatically remove unused imports when you run the linter with the `--fix` flag.

```typescript
// ❌ Before running the linter:
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button } from 'react-native';

const MyComponent = () => {
  const [count, setCount] = useState(0);
  
  return (
    <View>
      <Text>{count}</Text>
    </View>
  );
};

// ✅ After running the linter (unused imports are removed):
import React, { useState } from 'react';
import { View, Text } from 'react-native';

const MyComponent = () => {
  const [count, setCount] = useState(0);
  
  return (
    <View>
      <Text>{count}</Text>
    </View>
  );
};
```

### Importing Assets

For asset imports, we allow `require()` style imports as they're commonly needed in React Native:

```typescript
// ✅ Allowed for assets
const font = useFont(require('@assets/fonts/Roboto-Regular.ttf'), 10);
const image = require('@assets/images/logo.png');
```

## Running the Linter

```bash
# Check for linting issues
yarn lint

# Fix automatically fixable issues (includes removing unused imports)
yarn lint:fix

# Run the script to find nullish coalescing issues (you'll need to fix these manually)
yarn lint:fix-nullish

# Run the script to clean up unused imports
yarn lint:fix-imports
```

## Manual Fix Process

To manually fix nullish coalescing issues:

1. Run `yarn lint:fix-nullish` to identify files with issues
2. For each highlighted line, replace `||` with `??` when appropriate
3. In cases where `||` is actually desired behavior (for handling falsy values like empty strings), add a comment explaining why `??` is not used
