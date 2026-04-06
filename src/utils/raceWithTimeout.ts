export function resolveAfter<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function raceWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
  label?: string
): Promise<T> {
  const timeout = resolveAfter(timeoutMs, fallback).then((v) => {
    console.warn(`[raceWithTimeout] ${label ?? 'promise'} exceeded ${timeoutMs}ms — falling back to default`);
    return v;
  });
  return Promise.race([promise, timeout]);
}

/**
 * Like raceWithTimeout but signals cancellation via AbortController when the timeout fires.
 * The abortable promise should respect signal.aborted / signal.onabort to clean up resources.
 */
export function raceWithTimeoutAndAbort<T>(
  makePromise: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  fallback: T,
  label?: string
): Promise<T> {
  const controller = new AbortController();
  const promise = makePromise(controller.signal);

  const timeout = resolveAfter(timeoutMs, fallback).then((v) => {
    controller.abort();
    console.warn(`[raceWithTimeout] ${label ?? 'promise'} exceeded ${timeoutMs}ms — aborted and falling back to default`);
    return v;
  });

  return Promise.race([promise, timeout]);
}
