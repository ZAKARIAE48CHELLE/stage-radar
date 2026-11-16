import '@testing-library/jest-dom';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined') {
  window.ResizeObserver = MockResizeObserver;
}
globalThis.ResizeObserver = MockResizeObserver;

