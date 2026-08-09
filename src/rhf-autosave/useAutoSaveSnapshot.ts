import { useSyncExternalStore } from "react";
import type { AutoSaveController } from "./types";

export function useAutoSaveSnapshot(controller: AutoSaveController) {
  return useSyncExternalStore(
    controller.subscribeStatus,
    controller.getSnapshot,
    controller.getSnapshot,
  );
}
