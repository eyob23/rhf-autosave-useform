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
import type { AutoSaveController } from "./types";

type Registration = {
  controller: AutoSaveController;
  token: symbol;
};

type RegistryContextValue = {
  controllers: ReadonlyMap<string, Registration>;
  register: (statusKey: string, controller: AutoSaveController) => () => void;
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
    (statusKey: string, controller: AutoSaveController) => {
      const token = Symbol(statusKey);
      setControllers((current) => {
        const next = new Map(current);
        next.set(statusKey, { controller, token });
        return next;
      });

      return () => {
        setControllers((current) => {
          if (current.get(statusKey)?.token !== token) return current;
          const next = new Map(current);
          next.delete(statusKey);
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
};

export function AutoSaveStatusRegistration({
  statusKey,
  controller,
}: RegistrationProps) {
  const { register } = useRegistry();

  useEffect(
    () => register(statusKey, controller),
    [controller, register, statusKey],
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
