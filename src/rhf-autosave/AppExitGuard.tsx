import { useEffect } from "react";
import type { AutoSaveController } from "./types";

type Props = { controller: AutoSaveController };

export function AppExitGuard({ controller }: Props) {
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!controller.hasUnsavedChanges()) return;
      controller.flushBestEffort();
      event.preventDefault();
      event.returnValue = "";
    };

    const persistPendingChanges = () => controller.flushBestEffort();
    const visibilityChange = () => {
      if (document.visibilityState === "hidden") persistPendingChanges();
    };

    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("pagehide", persistPendingChanges);
    document.addEventListener("visibilitychange", visibilityChange);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("pagehide", persistPendingChanges);
      document.removeEventListener("visibilitychange", visibilityChange);
    };
  }, [controller]);

  return null;
}
