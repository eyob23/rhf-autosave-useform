import { useEffect, useState } from "react";
import type { AutoSaveController } from "./types";
import { useAutoSaveSnapshot } from "./useAutoSaveSnapshot";

type Props = { controller: AutoSaveController };

export function AutoSaveStatus({ controller }: Props) {
  const snapshot = useAutoSaveSnapshot(controller);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (snapshot.state !== "dirty" || snapshot.saveDueAt === null) return;

    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [snapshot.saveDueAt, snapshot.state]);

  const forceSave = () => {
    void controller.flush().catch(() => {
      // The controller publishes the error for the status UI.
    });
  };

  let className = "save-status";
  let statusAnnouncement = "";
  let errorAnnouncement = "";
  let content: React.ReactNode;

  if (snapshot.state === "idle") {
    className += " muted";
    statusAnnouncement = "Ready";
    content = <span aria-hidden="true">Ready</span>;
  } else if (snapshot.state === "dirty") {
    const remainingSeconds =
      snapshot.saveDueAt === null
        ? 0
        : Math.max(0, snapshot.saveDueAt - now) / 1000;

    statusAnnouncement = "Unsaved changes";
    content = (
      <>
        <span aria-hidden="true">
          Autosaving in {remainingSeconds.toFixed(0)}s
        </span>
        <button type="button" className="force-save-button" onClick={forceSave}>
          Save now
        </button>
      </>
    );
  } else if (snapshot.state === "saving") {
    statusAnnouncement = "Saving";
    content = (
      <span aria-hidden="true">
        <span className="spinner" /> Saving…
      </span>
    );
  } else if (snapshot.state === "error") {
    className += " error";
    errorAnnouncement = `Couldn't save. ${snapshot.error ?? ""}`.trim();
    content = (
      <>
        <span aria-hidden="true">{errorAnnouncement}</span>
        <button
          type="button"
          className="link-button"
          onClick={() => void controller.retry().catch(() => undefined)}
        >
          Retry
        </button>
      </>
    );
  } else {
    className += " success";
    statusAnnouncement = `Saved ${
      snapshot.lastSavedAt
        ? new Date(snapshot.lastSavedAt).toLocaleTimeString()
        : ""
    }`.trim();
    content = <span aria-hidden="true">✓ {statusAnnouncement}</span>;
  }

  return (
    <div className={className}>
      <span className="sr-only" role="status" aria-live="polite">
        {statusAnnouncement}
      </span>
      <span className="sr-only" role="alert">
        {errorAnnouncement}
      </span>
      {content}
    </div>
  );
}
