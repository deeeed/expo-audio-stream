import { by, element, expect as detoxExpect, device, waitFor } from 'detox'

// Define direction type locally
type ScrollDirection = 'up' | 'down' | 'left' | 'right';

// RECOMMENDED: Most robust scrolling using Detox's built-in waitFor + whileElement
export async function waitForElementWhileScrolling(
  elementMatcher: any,
  direction: ScrollDirection = 'down',
  scrollDistance = 200,
  scrollElementId = 'agent-validation-wrapper',
  timeout = 10000
) {
  try {
    // Use timeout in a separate waitFor call since whileElement().scroll() doesn't support chaining withTimeout
    await waitFor(element(elementMatcher))
      .toBeVisible()
      .whileElement(by.id(scrollElementId))
      .scroll(scrollDistance, direction as any, NaN, 0.5);
    return true;
  } catch (error) {
    console.log(`Element not found after scrolling: ${error}`);
    return false;
  }
}

// Legacy approach - still useful for custom logic
export async function scrollUntilVisible(
  elementMatcher: any, 
  direction: ScrollDirection = 'down', 
  maxScrolls = 5,
  scrollElementId = 'agent-validation-wrapper' // Default to the main wrapper
) {
  for (let i = 0; i < maxScrolls; i++) {
    try {
      // Check if element is already visible
      await detoxExpect(element(elementMatcher)).toBeVisible();
      return true; // Element is visible, no need to scroll further
    } catch (e) {
      // Element not visible, scroll and try again
      try {
        // Try using the scroll element ID first
        await element(by.id(scrollElementId)).scroll(300, direction as any);
      } catch (scrollError) {
        // Fallback to platform-specific scroll view types
        const scrollViewType = device.getPlatform() === 'android' 
          ? 'android.widget.ScrollView' 
          : 'RCTScrollView';
        await element(by.type(scrollViewType)).scroll(300, direction as any);
      }
      await new Promise(resolve => setTimeout(resolve, 300)); // Small pause for UI to settle
    }
  }
  
  // One final check after all scrolls
  await detoxExpect(element(elementMatcher)).toBeVisible();
  return true;
}

// Alternative: Simple scroll by distance without element targeting
export async function scrollScreen(
  direction: ScrollDirection = 'down',
  distance = 300,
  scrollElementId = 'agent-validation-wrapper'
) {
  try {
    await element(by.id(scrollElementId)).scroll(distance, direction as any);
  } catch (scrollError) {
    // Fallback to platform-specific scroll view types
    const scrollViewType = device.getPlatform() === 'android' 
      ? 'android.widget.ScrollView' 
      : 'RCTScrollView';
    await element(by.type(scrollViewType)).scroll(distance, direction as any);
  }
  await new Promise(resolve => setTimeout(resolve, 200));
}

// Helper function to scroll to bottom of screen
export async function scrollToBottom(maxScrolls = 10, scrollElementId = 'agent-validation-wrapper') {
  for (let i = 0; i < maxScrolls; i++) {
    await scrollScreen('down', 500, scrollElementId);
  }
}

// Helper function to scroll to top of screen
export async function scrollToTop(maxScrolls = 10, scrollElementId = 'agent-validation-wrapper') {
  for (let i = 0; i < maxScrolls; i++) {
    await scrollScreen('up', 500, scrollElementId);
  }
}