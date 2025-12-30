/**
 * Simple event emitter for React Native
 * Provides window-like event API for cross-platform compatibility
 */

/**
 * CustomEvent interface for cross-platform compatibility
 */
export interface CustomEvent<T = unknown> {
  type: string;
  detail: T;
}

/**
 * CustomEvent polyfill implementation for React Native
 */
class CustomEventPolyfill<T = unknown> implements CustomEvent<T> {
  type: string;
  detail: T;

  constructor(type: string, options?: { detail?: T }) {
    this.type = type;
    this.detail = (options?.detail ?? undefined) as T;
  }
}

export type EventListener = (event: CustomEvent) => void;

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

/**
 * Creates a CustomEvent instance
 * Uses native CustomEvent on web, polyfill on React Native
 */
export const createCustomEvent = <T = unknown>(
  type: string,
  detail?: T
): CustomEvent<T> => {
  // Use native CustomEvent if available (web), otherwise use polyfill
  if (
    typeof globalThis !== "undefined" &&
    typeof (globalThis as { CustomEvent?: unknown }).CustomEvent !== "undefined"
  ) {
    const NativeCustomEventConstructor = (
      globalThis as {
        CustomEvent: new (
          type: string,
          options?: { detail?: unknown }
        ) => {
          type: string;
          detail: unknown;
        };
      }
    ).CustomEvent;
    const nativeEvent = new NativeCustomEventConstructor(type, { detail });
    return { type: nativeEvent.type, detail: nativeEvent.detail as T };
  }
  return new CustomEventPolyfill(type, { detail });
};
