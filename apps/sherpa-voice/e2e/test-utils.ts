import { by, element, expect as detoxExpect, device, waitFor } from 'detox'

type ScrollDirection = 'up' | 'down' | 'left' | 'right';

export async function waitForElementWhileScrolling(
  elementMatcher: any,
  direction: ScrollDirection = 'down',
  scrollDistance = 200,
  scrollElementId = 'main-scroll-view',
  timeout = 10000
) {
  try {
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

export async function scrollUntilVisible(
  elementMatcher: any,
  direction: ScrollDirection = 'down',
  maxScrolls = 5,
  scrollElementId = 'main-scroll-view'
) {
  for (let i = 0; i < maxScrolls; i++) {
    try {
      await detoxExpect(element(elementMatcher)).toBeVisible();
      return true;
    } catch (e) {
      try {
        await element(by.id(scrollElementId)).scroll(300, direction as any);
      } catch (scrollError) {
        const scrollViewType = device.getPlatform() === 'android'
          ? 'android.widget.ScrollView'
          : 'RCTScrollView';
        await element(by.type(scrollViewType)).scroll(300, direction as any);
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  await detoxExpect(element(elementMatcher)).toBeVisible();
  return true;
}

export async function scrollScreen(
  direction: ScrollDirection = 'down',
  distance = 300,
  scrollElementId = 'main-scroll-view'
) {
  try {
    await element(by.id(scrollElementId)).scroll(distance, direction as any);
  } catch (scrollError) {
    const scrollViewType = device.getPlatform() === 'android'
      ? 'android.widget.ScrollView'
      : 'RCTScrollView';
    await element(by.type(scrollViewType)).scroll(distance, direction as any);
  }
  await new Promise(resolve => setTimeout(resolve, 200));
}

export async function scrollToBottom(maxScrolls = 10, scrollElementId = 'main-scroll-view') {
  for (let i = 0; i < maxScrolls; i++) {
    await scrollScreen('down', 500, scrollElementId);
  }
}

export async function scrollToTop(maxScrolls = 10, scrollElementId = 'main-scroll-view') {
  for (let i = 0; i < maxScrolls; i++) {
    await scrollScreen('up', 500, scrollElementId);
  }
}
