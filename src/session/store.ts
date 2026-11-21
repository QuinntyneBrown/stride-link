// A minimal observable value: the session publishes state, the UI renders it.

export class Store<T> {
  private value: T;
  private readonly listeners = new Set<(value: T) => void>();

  constructor(initial: T) {
    this.value = initial;
  }

  get(): T {
    return this.value;
  }

  update(change: Partial<T>): void {
    this.value = { ...this.value, ...change };
    for (const listener of this.listeners) listener(this.value);
  }

  subscribe(listener: (value: T) => void): void {
    this.listeners.add(listener);
    listener(this.value);
  }
}
