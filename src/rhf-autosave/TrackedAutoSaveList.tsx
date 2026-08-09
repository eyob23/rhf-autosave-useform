import { type ReactNode, useEffect, useId, useState } from "react";
import {
  type TrackedAutoSave,
  useTrackedAutoSaves,
} from "./AutoSaveStatusRegistry";
import "./TrackedAutoSaveList.css";

type TrackedStateProps = {
  tracked: TrackedAutoSave;
  formatSavedAt: (timestamp: number) => string;
};

function TrackedAutoSaveState({ tracked, formatSavedAt }: TrackedStateProps) {
  const { snapshot } = tracked;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (snapshot.state !== "dirty" || snapshot.saveDueAt === null) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(interval);
  }, [snapshot.saveDueAt, snapshot.state]);

  if (snapshot.state === "dirty") {
    const remainingSeconds =
      snapshot.saveDueAt === null
        ? 0
        : Math.max(0, snapshot.saveDueAt - now) / 1000;
    return <>Autosaving in {remainingSeconds.toFixed(1)}s</>;
  }
  if (snapshot.state === "saving") return <>Saving...</>;
  if (snapshot.state === "error") {
    return <>{snapshot.error || "Save failed"}</>;
  }
  if (snapshot.state === "saved") {
    return (
      <>
        Saved
        {snapshot.lastSavedAt
          ? ` at ${formatSavedAt(snapshot.lastSavedAt)}`
          : ""}
      </>
    );
  }
  return <>Ready</>;
}

export type TrackedAutoSaveListProps = {
  title?: ReactNode;
  eyebrow?: ReactNode;
  emptyMessage?: ReactNode;
  activeLabel?: ReactNode;
  retainedLabel?: ReactNode;
  className?: string;
  formatSavedAt?: (timestamp: number) => string;
};

export function TrackedAutoSaveList({
  title = "Tracked autosaves",
  eyebrow,
  emptyMessage = "No autosaves are being tracked.",
  activeLabel = "Active",
  retainedLabel = "Session",
  className,
  formatSavedAt = (timestamp) => new Date(timestamp).toLocaleTimeString(),
}: TrackedAutoSaveListProps) {
  const titleId = useId();
  const trackedAutoSaves = useTrackedAutoSaves().sort(
    (first, second) =>
      Number(second.isActive) - Number(first.isActive) ||
      first.label.localeCompare(second.label),
  );
  const rootClassName = ["rhf-autosave-tracker", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={rootClassName} aria-labelledby={titleId}>
      <div className="rhf-autosave-tracker__heading">
        <div>
          {eyebrow && (
            <span className="rhf-autosave-tracker__eyebrow">{eyebrow}</span>
          )}
          <h2 id={titleId}>{title}</h2>
        </div>
        <strong aria-label={`${trackedAutoSaves.length} tracked autosaves`}>
          {trackedAutoSaves.length}
        </strong>
      </div>
      {trackedAutoSaves.length === 0 ? (
        <p className="rhf-autosave-tracker__empty">{emptyMessage}</p>
      ) : (
        <ul className="rhf-autosave-tracker__list">
          {trackedAutoSaves.map((tracked) => (
            <li key={tracked.statusKey}>
              <div>
                <span
                  className={`rhf-autosave-tracker__presence ${
                    tracked.isActive ? "is-active" : "is-retained"
                  }`}
                >
                  {tracked.isActive ? activeLabel : retainedLabel}
                </span>
                <strong>{tracked.label}</strong>
              </div>
              <span
                className={`rhf-autosave-tracker__state is-${tracked.snapshot.state}`}
              >
                <TrackedAutoSaveState
                  tracked={tracked}
                  formatSavedAt={formatSavedAt}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
