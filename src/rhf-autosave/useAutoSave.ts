import { useCallback, useEffect, useMemo, useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import type { AutoSaveController, AutoSaveSnapshot } from "./types";

export type AutoSaveFunction<T extends FieldValues> = (
  values: T,
  signal: AbortSignal,
) => Promise<void>;

type Options<T extends FieldValues> = {
  form: UseFormReturn<T>;
  save: AutoSaveFunction<T>;
  debounceMs?: number;
  requestTimeoutMs?: number;
  snapshot?: (values: T) => T;
  formatError?: (error: unknown) => string;
};

const initialSnapshot: AutoSaveSnapshot = {
  state: "idle",
  lastSavedAt: null,
  saveDueAt: null,
  error: null,
};

const defaultFormatError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error !== "object" || error === null) return "Autosave failed";

  const candidate = error as {
    data?: unknown;
    error?: unknown;
    status?: unknown;
  };
  if (typeof candidate.data === "string") return candidate.data;
  if (
    typeof candidate.data === "object" &&
    candidate.data !== null &&
    "message" in candidate.data &&
    typeof candidate.data.message === "string"
  ) {
    return candidate.data.message;
  }
  if (typeof candidate.error === "string") return candidate.error;
  if (candidate.status !== undefined) {
    return `Autosave failed (${String(candidate.status)})`;
  }
  return "Autosave failed";
};

/**
 * Create an autosave controller for a React Hook Form instance.
 *
 * The controller debounces edits, serializes requests, aborts on unmount,
 * and exposes status snapshots that can be rendered anywhere in the app.
 */
export function useAutoSave<T extends FieldValues>({
  form,
  save,
  debounceMs = 20000,
  requestTimeoutMs = 15000,
  snapshot = (values) => structuredClone(values) as T,
  formatError = defaultFormatError,
}: Options<T>): AutoSaveController {
  const saveRef = useRef(save);
  saveRef.current = save;
  const snapshotValuesRef = useRef(snapshot);
  snapshotValuesRef.current = snapshot;
  const formatErrorRef = useRef(formatError);
  formatErrorRef.current = formatError;

  const initializedRef = useRef(false);
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const disposedRef = useRef(false);

  const snapshotRef = useRef<AutoSaveSnapshot>(initialSnapshot);
  const listenersRef = useRef(new Set<() => void>());

  const publish = useCallback((next: AutoSaveSnapshot) => {
    snapshotRef.current = next;
    listenersRef.current.forEach((listener) => listener());
  }, []);

  const cancelTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hasUnsavedChanges = useCallback(
    () =>
      revisionRef.current > savedRevisionRef.current ||
      inFlightRef.current !== null,
    [],
  );

  const saveLatest = useCallback(async () => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }
    if (savedRevisionRef.current >= revisionRef.current) {
      return;
    }

    // Capture the latest form values once per save attempt so retries and
    // overlapping edits do not read a moving target.
    const targetRevision = revisionRef.current;
    let values: T;
    try {
      values = snapshotValuesRef.current(form.getValues());
    } catch (error) {
      publish({
        ...snapshotRef.current,
        state: "error",
        saveDueAt: null,
        error: formatErrorRef.current(error),
      });
      throw error;
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    publish({
      ...snapshotRef.current,
      state: "saving",
      saveDueAt: null,
      error: null,
    });

    const request = (async () => {
      let didSave = false;
      let didTimeOut = false;
      let timeoutId: number | null = null;
      try {
        await Promise.race([
          saveRef.current(values, abortController.signal),
          new Promise<never>((_, reject) => {
            timeoutId = window.setTimeout(() => {
              didTimeOut = true;
              abortController.abort();
              reject(
                new Error(
                  "Autosave timed out. Check your connection and retry.",
                ),
              );
            }, requestTimeoutMs);
          }),
        ]);
        didSave = true;
        savedRevisionRef.current = Math.max(
          savedRevisionRef.current,
          targetRevision,
        );

        if (savedRevisionRef.current >= revisionRef.current) {
          publish({
            state: "saved",
            lastSavedAt: Date.now(),
            saveDueAt: null,
            error: null,
          });
        } else {
          publish({
            ...snapshotRef.current,
            state: "dirty",
            saveDueAt: null,
            error: null,
          });
        }
      } catch (error) {
        if (!disposedRef.current) {
          publish({
            ...snapshotRef.current,
            state: "error",
            saveDueAt: null,
            error: didTimeOut
              ? "Autosave timed out. Check your connection and retry."
              : formatErrorRef.current(error),
          });
        }
        throw error;
      } finally {
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
        inFlightRef.current = null;

        // If the user edited while this request was in flight and their
        // debounce fired before the request completed, make sure those newer
        // revisions still get another autosave.
        if (
          didSave &&
          !disposedRef.current &&
          savedRevisionRef.current < revisionRef.current &&
          timerRef.current === null
        ) {
          const saveDueAt = Date.now() + debounceMs;
          timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            void saveLatest().catch(() => {
              // Error state is published by saveLatest.
            });
          }, debounceMs);
          publish({
            ...snapshotRef.current,
            state: "dirty",
            saveDueAt,
            error: null,
          });
        }
      }
    })();

    inFlightRef.current = request;
    return request;
  }, [debounceMs, form, publish, requestTimeoutMs]);

  const scheduleSave = useCallback(() => {
    cancelTimer();
    // Debounce the next autosave instead of spawning a save for every keystroke.
    const saveDueAt = Date.now() + debounceMs;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void saveLatest().catch(() => {
        // Error state is published by saveLatest. Avoid an unhandled rejection.
      });
    }, debounceMs);
    publish({
      ...snapshotRef.current,
      state: "dirty",
      saveDueAt,
      error: null,
    });
  }, [cancelTimer, debounceMs, publish, saveLatest]);

  const flush = useCallback(async () => {
    cancelTimer();

    while (
      savedRevisionRef.current < revisionRef.current ||
      inFlightRef.current
    ) {
      if (inFlightRef.current) {
        await inFlightRef.current;
        continue;
      }
      cancelTimer();
      await saveLatest();
    }
  }, [cancelTimer, saveLatest]);

  const retry = useCallback(async () => {
    await flush();
  }, [flush]);

  const flushBestEffort = useCallback(() => {
    cancelTimer();
    if (
      savedRevisionRef.current < revisionRef.current &&
      !inFlightRef.current
    ) {
      // beforeunload/pagehide can only ask for a best-effort final save.
      void saveLatest().catch(() => {
        // Best effort only. beforeunload provides the actual safety net.
      });
    }
  }, [cancelTimer, saveLatest]);

  const initialize = useCallback(() => {
    // Call this immediately AFTER form.reset(serverData). The reset itself is
    // suppressed because initializedRef remains false until this point.
    revisionRef.current = 0;
    savedRevisionRef.current = 0;
    initializedRef.current = true;
    publish(initialSnapshot);
  }, [publish]);

  useEffect(() => {
    disposedRef.current = false;

    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: () => {
        if (!initializedRef.current || disposedRef.current) return;

        // Track each new form revision so the controller can decide whether a
        // newer edit arrived while the previous save was still in flight.
        revisionRef.current += 1;
        scheduleSave();
      },
    });

    return () => {
      disposedRef.current = true;
      cancelTimer();
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      unsubscribe();
    };
  }, [cancelTimer, form, publish, scheduleSave]);

  return useMemo(
    () => ({
      initialize,
      flush,
      retry,
      flushBestEffort,
      hasUnsavedChanges,
      isInitialized: () => initializedRef.current,
      getSnapshot: () => snapshotRef.current,
      subscribeStatus: (listener: () => void) => {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    }),
    [flush, flushBestEffort, hasUnsavedChanges, initialize, retry],
  );
}
