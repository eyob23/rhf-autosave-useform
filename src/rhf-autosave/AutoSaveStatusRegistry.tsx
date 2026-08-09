import {
  createContext,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AutoSaveStatus } from "./AutoSaveStatus";
import type { AutoSaveController, AutoSaveSnapshot } from "./types";

type Registration = {
  controller: AutoSaveController | null;
  isActive: boolean;
  label: string;
  snapshot: AutoSaveSnapshot;
  token: symbol | null;
};

type RegistryContextValue = {
  controllers: ReadonlyMap<string, Registration>;
  events: readonly AutoSaveLogEvent[];
  clearLog: (statusKey?: string) => void;
  register: (
    statusKey: string,
    controller: AutoSaveController,
    options: { label?: string; retainOnUnmount?: boolean },
  ) => () => void;
};

export type TrackedAutoSave = {
  statusKey: string;
  label: string;
  snapshot: AutoSaveSnapshot;
  isActive: boolean;
};

export type AutoSaveLogEventType =
  | "change-detected"
  | "save-started"
  | "retry-started"
  | "save-succeeded"
  | "save-failed"
  | "save-cancelled";

export type AutoSaveLogEvent = {
  id: string;
  statusKey: string;
  label: string;
  type: AutoSaveLogEventType;
  timestamp: number;
  durationMs?: number;
  error?: string;
};

const RegistryContext = createContext<RegistryContextValue | null>(null);

function useRegistry() {
  const registry = useContext(RegistryContext);
  if (!registry) {
    throw new Error(
      "Autosave status registration requires an AutoSaveStatusProvider.",
    );
  }
  return registry;
}

type ProviderProps = PropsWithChildren<{
  maxLogEntries?: number;
}>;

function getEventType(
  previous: AutoSaveSnapshot,
  current: AutoSaveSnapshot,
): AutoSaveLogEventType | null {
  if (current.state === "dirty") return "change-detected";
  if (current.state === "saving") {
    return previous.state === "error" ? "retry-started" : "save-started";
  }
  if (current.state === "saved") return "save-succeeded";
  if (current.state === "error") return "save-failed";
  if (
    current.state === "idle" &&
    (previous.state === "dirty" || previous.state === "saving")
  ) {
    return "save-cancelled";
  }
  return null;
}

export function AutoSaveStatusProvider({
  children,
  maxLogEntries = 200,
}: ProviderProps) {
  const [controllers, setControllers] = useState(
    () => new Map<string, Registration>(),
  );
  const [events, setEvents] = useState<AutoSaveLogEvent[]>([]);
  const eventSequence = useRef(0);
  const clearLog = useCallback(
    (statusKey?: string) =>
      setEvents((current) =>
        statusKey
          ? current.filter((event) => event.statusKey !== statusKey)
          : [],
      ),
    [],
  );

  const appendEvent = useCallback(
    (
      statusKey: string,
      label: string,
      type: AutoSaveLogEventType,
      snapshot: AutoSaveSnapshot,
      durationMs?: number,
    ) => {
      const timestamp = Date.now();
      const event: AutoSaveLogEvent = {
        id: `${statusKey}:${timestamp}:${eventSequence.current++}`,
        statusKey,
        label,
        type,
        timestamp,
        ...(durationMs === undefined ? {} : { durationMs }),
        ...(snapshot.error ? { error: snapshot.error } : {}),
      };
      setEvents((current) =>
        [event, ...current].slice(0, Math.max(0, maxLogEntries)),
      );
    },
    [maxLogEntries],
  );

  const register = useCallback(
    (
      statusKey: string,
      controller: AutoSaveController,
      {
        label = statusKey,
        retainOnUnmount = false,
      }: { label?: string; retainOnUnmount?: boolean },
    ) => {
      const token = Symbol(statusKey);
      let previousSnapshot = controller.getSnapshot();
      let saveStartedAt: number | null = null;
      const publish = () => {
        const snapshot = controller.getSnapshot();
        const eventType = getEventType(previousSnapshot, snapshot);
        if (eventType) {
          const now = Date.now();
          const durationMs =
            (eventType === "save-succeeded" || eventType === "save-failed") &&
            saveStartedAt !== null
              ? now - saveStartedAt
              : undefined;
          if (eventType === "save-started" || eventType === "retry-started") {
            saveStartedAt = now;
          }
          appendEvent(statusKey, label, eventType, snapshot, durationMs);
          if (eventType === "save-succeeded" || eventType === "save-failed") {
            saveStartedAt = null;
          }
        }
        previousSnapshot = snapshot;
        setControllers((current) => {
          if (current.get(statusKey)?.token !== token) return current;
          const next = new Map(current);
          next.set(statusKey, {
            controller,
            isActive: true,
            label,
            snapshot,
            token,
          });
          return next;
        });
      };

      setControllers((current) => {
        const next = new Map(current);
        next.set(statusKey, {
          controller,
          isActive: true,
          label,
          snapshot: controller.getSnapshot(),
          token,
        });
        return next;
      });
      const unsubscribe = controller.subscribeStatus(publish);

      return () => {
        unsubscribe();
        setControllers((current) => {
          if (current.get(statusKey)?.token !== token) return current;
          const next = new Map(current);
          if (retainOnUnmount) {
            next.set(statusKey, {
              controller: null,
              isActive: false,
              label,
              snapshot: controller.getSnapshot(),
              token: null,
            });
          } else {
            next.delete(statusKey);
          }
          return next;
        });
      };
    },
    [appendEvent],
  );

  const value = useMemo(
    () => ({ clearLog, controllers, events, register }),
    [clearLog, controllers, events, register],
  );

  return (
    <RegistryContext.Provider value={value}>
      {children}
    </RegistryContext.Provider>
  );
}

type RegistrationProps = {
  statusKey: string;
  controller: AutoSaveController;
  label?: string;
  retainOnUnmount?: boolean;
};

export function AutoSaveStatusRegistration({
  statusKey,
  controller,
  label,
  retainOnUnmount,
}: RegistrationProps) {
  const { register } = useRegistry();

  useEffect(
    () => register(statusKey, controller, { label, retainOnUnmount }),
    [controller, label, register, retainOnUnmount, statusKey],
  );

  return null;
}

type RegisteredStatusProps = {
  statusKey: string;
  fallback?: ReactNode;
};

export function RegisteredAutoSaveStatus({
  statusKey,
  fallback = null,
}: RegisteredStatusProps) {
  const { controllers } = useRegistry();
  const controller = controllers.get(statusKey)?.controller;

  return controller ? <AutoSaveStatus controller={controller} /> : fallback;
}

export function useTrackedAutoSaves(): TrackedAutoSave[] {
  const { controllers } = useRegistry();

  return useMemo(
    () =>
      Array.from(controllers, ([statusKey, registration]) => ({
        statusKey,
        label: registration.label,
        snapshot: registration.snapshot,
        isActive: registration.isActive,
      })),
    [controllers],
  );
}

type AutoSaveLogOptions = {
  statusKey?: string;
  limit?: number;
};

export function useAutoSaveLog({
  statusKey,
  limit,
}: AutoSaveLogOptions = {}): readonly AutoSaveLogEvent[] {
  const { events } = useRegistry();

  return useMemo(() => {
    const filtered = statusKey
      ? events.filter((event) => event.statusKey === statusKey)
      : events;
    return limit === undefined ? filtered : filtered.slice(0, limit);
  }, [events, limit, statusKey]);
}

export function useClearAutoSaveLog(statusKey?: string) {
  const { clearLog } = useRegistry();
  return useCallback(() => clearLog(statusKey), [clearLog, statusKey]);
}
