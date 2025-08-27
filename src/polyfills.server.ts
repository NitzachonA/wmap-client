// Server-side polyfills
// Import Zone.js for Node so Angular's server bootstrap has zone support
import 'zone.js/node';

// Apply polyfill only in server environment where window is undefined
if (typeof window === 'undefined') {
  class ServerResizeObserver {
    private callbacks = new Set<ResizeObserverCallback>();

    observe(target: Element) {
      // Create a minimal implementation that does nothing but prevents errors
    }

    unobserve(target: Element) {
      // Remove observation
    }

    disconnect() {
      this.callbacks.clear();
    }
  }

  (global as any).ResizeObserver = ServerResizeObserver;
}
