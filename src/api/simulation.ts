import { useSyncExternalStore } from "react";

export type ApiSimulationMode =
  | "normal"
  | "slow"
  | "timeout"
  | "offline"
  | "server-error"
  | "flaky";

export type ApiSimulationState = {
  mode: ApiSimulationMode;
  latencyMs: number;
  failureRate: number;
  failNextSave: boolean;
  affectReads: boolean;
};

type RequestKind = "read" | "save";

const storageKey = "rhf-autosave-api-simulation";

export const apiSimulationPresets: Record<
  ApiSimulationMode,
  Pick<ApiSimulationState, "latencyMs" | "failureRate">
> = {
  normal: { latencyMs: 650, failureRate: 0 },
  slow: { latencyMs: 5000, failureRate: 0 },
  timeout: { latencyMs: 20000, failureRate: 0 },
  offline: { latencyMs: 0, failureRate: 0 },
  "server-error": { latencyMs: 650, failureRate: 1 },
  flaky: { latencyMs: 650, failureRate: 0.5 },
};

const defaultState: ApiSimulationState = {
  mode: "normal",
  ...apiSimulationPresets.normal,
  failNextSave: false,
  affectReads: false,
};

function readStoredState(): ApiSimulationState {
  if (typeof window === "undefined") return defaultState;
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (!stored) return defaultState;
    const candidate = JSON.parse(stored) as Partial<ApiSimulationState>;
    if (!candidate.mode || !(candidate.mode in apiSimulationPresets)) {
      return defaultState;
    }
    return {
      ...defaultState,
      ...candidate,
      latencyMs: Math.max(0, Number(candidate.latencyMs) || 0),
      failureRate: Math.min(1, Math.max(0, Number(candidate.failureRate) || 0)),
    };
  } catch {
    return defaultState;
  }
}

let state = readStoredState();
const listeners = new Set<() => void>();

function publish(next: ApiSimulationState) {
  state = next;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(storageKey, JSON.stringify(state));
  }
  listeners.forEach((listener) => listener());
}

function update(patch: Partial<ApiSimulationState>) {
  publish({ ...state, ...patch });
}

function setMode(mode: ApiSimulationMode) {
  publish({ ...state, mode, ...apiSimulationPresets[mode] });
}

function consumeFailNextSave() {
  if (!state.failNextSave) return false;
  update({ failNextSave: false });
  return true;
}

export const apiSimulation = {
  getSnapshot: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setMode,
  setLatencyMs: (latencyMs: number) =>
    update({ latencyMs: Math.max(0, latencyMs) }),
  setFailureRate: (failureRate: number) =>
    update({ failureRate: Math.min(1, Math.max(0, failureRate)) }),
  setAffectReads: (affectReads: boolean) => update({ affectReads }),
  setFailNextSave: (failNextSave: boolean) => update({ failNextSave }),
  reset: () => publish(defaultState),
};

export function useApiSimulation() {
  return useSyncExternalStore(
    apiSimulation.subscribe,
    apiSimulation.getSnapshot,
    apiSimulation.getSnapshot,
  );
}

export class SimulatedApiError extends Error {
  constructor(
    message: string,
    readonly status: number | "OFFLINE",
  ) {
    super(message);
    this.name = "SimulatedApiError";
  }
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function runSimulatedRequest<T>(
  kind: RequestKind,
  signal: AbortSignal | undefined,
  execute: () => T | Promise<T>,
  defaultLatencyMs: number,
): Promise<T> {
  const snapshot = apiSimulation.getSnapshot();
  const shouldSimulate = kind === "save" || snapshot.affectReads;
  const failOnce = kind === "save" && consumeFailNextSave();

  if (shouldSimulate && snapshot.mode === "offline") {
    throw new SimulatedApiError(
      "Network unavailable. Disable offline mode and retry.",
      "OFFLINE",
    );
  }

  await delay(shouldSimulate ? snapshot.latencyMs : defaultLatencyMs, signal);

  if (failOnce) {
    throw new SimulatedApiError("Simulated one-time save failure.", 503);
  }
  if (shouldSimulate && snapshot.mode === "server-error") {
    throw new SimulatedApiError("Simulated server error.", 500);
  }
  if (
    shouldSimulate &&
    snapshot.mode === "flaky" &&
    Math.random() < snapshot.failureRate
  ) {
    throw new SimulatedApiError("Simulated intermittent failure.", 503);
  }

  return execute();
}
