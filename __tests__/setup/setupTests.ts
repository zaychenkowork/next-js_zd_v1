import '@testing-library/jest-dom';

import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './msw/server';

/**
 * `onUnhandledRequest: 'error'` on purpose. The alternative ('warn') lets a
 * component quietly call an endpoint nobody declared, and the test still passes —
 * which is how a suite ends up green while the feature is broken.
 */
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * jsdom implements neither of these, and Base UI's popups (Select, Dialog,
 * Tooltip) measure their anchor with `ResizeObserver` on mount. Without the stub
 * every popup test throws before it renders.
 */
Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
