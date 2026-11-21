// The session's only access to time, so Playwright's clock can drive every timer.

export type TimerId = number;

export interface Clock {
  /** Monotonic milliseconds (performance.now()). */
  now(): number;
  /** Wall-clock milliseconds since the epoch, for ISO times and file names. */
  wallTime(): number;
  setTimeout(callback: () => void, ms: number): TimerId;
  clearTimeout(id: TimerId): void;
}

export const browserClock: Clock = {
  now: () => performance.now(),
  wallTime: () => Date.now(),
  setTimeout: (callback, ms) => window.setTimeout(callback, ms),
  clearTimeout: (id) => { window.clearTimeout(id); },
};
