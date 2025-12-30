/**
 * Simple event emitter for React Native
 * Provides window-like event API for cross-platform compatibility
 */

type EventListener = (event: CustomEvent) => void;

class EventEmitter {
  private readonly listeners = new Map<string, Set<EventListener>>();

  addEventListener(event: string, listener: EventListener): void {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  removeEventListener(event: string, listener: EventListener): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  dispatchEvent(event: CustomEvent): boolean {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(
            `[EventEmitter] Error in listener for ${event.type}:`,
            error
          );
        }
      }
    }
    return true;
  }
}

// Create singleton instance
const eventEmitter = new EventEmitter();

/**
 * Cross-platform event target interface
 */
interface EventTargetInterface {
  addEventListener: (event: string, listener: EventListener) => void;
  removeEventListener: (event: string, listener: EventListener) => void;
  dispatchEvent: (event: CustomEvent) => boolean;
}

/**
 * Cross-platform event target
 * Uses window in web, custom emitter in React Native
 */
export const eventTarget: EventTargetInterface =
  typeof window !== "undefined" && typeof window.addEventListener === "function"
    ? (window as unknown as EventTargetInterface)
    : eventEmitter;
