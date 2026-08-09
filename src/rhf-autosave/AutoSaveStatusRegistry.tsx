import {
  createContext,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

export function AutoSaveStatusProvider({ children }: PropsWithChildren) {
  const [controllers, setControllers] = useState(
    () => new Map<string, Registration>(),
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
      const publish = () => {
        setControllers((current) => {
          if (current.get(statusKey)?.token !== token) return current;
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
    [],
  );

  const value = useMemo(
    () => ({ controllers, register }),
    [controllers, register],
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
