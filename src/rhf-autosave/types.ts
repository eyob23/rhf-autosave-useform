export type AutoSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export type AutoSaveSnapshot = {
  state: AutoSaveState;
  lastSavedAt: number | null;
  saveDueAt: number | null;
  error: string | null;
};

export type AutoSaveController = {
  initialize: () => void;
  flush: () => Promise<void>;
  retry: () => Promise<void>;
  flushBestEffort: () => void;
  hasUnsavedChanges: () => boolean;
  isInitialized: () => boolean;
  getSnapshot: () => AutoSaveSnapshot;
  subscribeStatus: (listener: () => void) => () => void;
};
