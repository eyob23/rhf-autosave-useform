import { type ReactNode, useId } from "react";
import {
  type AutoSaveLogEvent,
  useAutoSaveLog,
  useClearAutoSaveLog,
} from "./AutoSaveStatusRegistry";
import "./AutoSaveEventLog.css";

const eventLabels: Record<AutoSaveLogEvent["type"], string> = {
  "change-detected": "Change detected",
  "save-started": "Save started",
  "retry-started": "Retry started",
  "save-succeeded": "Saved",
  "save-failed": "Save failed",
  "save-cancelled": "Save cancelled",
};

function EventDetail({ event }: { event: AutoSaveLogEvent }) {
  if (event.error) return <>{event.error}</>;
  if (event.durationMs !== undefined) {
    return <>Completed in {event.durationMs}ms</>;
  }
  return null;
}

export type AutoSaveEventLogProps = {
  statusKey?: string;
  title?: ReactNode;
  eyebrow?: ReactNode;
  emptyMessage?: ReactNode;
  clearLabel?: ReactNode;
  className?: string;
  limit?: number;
  formatTime?: (timestamp: number) => string;
};

export function AutoSaveEventLog({
  statusKey,
  title = "Autosave activity",
  eyebrow,
  emptyMessage = "No autosave activity in this session.",
  clearLabel = "Clear log",
  className,
  limit = 20,
  formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString(),
}: AutoSaveEventLogProps) {
  const titleId = useId();
  const events = useAutoSaveLog({ statusKey, limit });
  const clearLog = useClearAutoSaveLog(statusKey);
  const rootClassName = ["rhf-autosave-log", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={rootClassName} aria-labelledby={titleId}>
      <div className="rhf-autosave-log__heading">
        <div>
          {eyebrow && (
            <span className="rhf-autosave-log__eyebrow">{eyebrow}</span>
          )}
          <h2 id={titleId}>{title}</h2>
        </div>
        <div className="rhf-autosave-log__actions">
          <strong aria-label={`${events.length} autosave log events`}>
            {events.length}
          </strong>
          {events.length > 0 && (
            <button type="button" onClick={clearLog}>
              {clearLabel}
            </button>
          )}
        </div>
      </div>
      {events.length === 0 ? (
        <p className="rhf-autosave-log__empty">{emptyMessage}</p>
      ) : (
        <ol className="rhf-autosave-log__list">
          {events.map((event) => (
            <li key={event.id}>
              <span
                className={`rhf-autosave-log__marker is-${event.type}`}
                aria-hidden="true"
              />
              <div className="rhf-autosave-log__event">
                <div>
                  <strong>{eventLabels[event.type]}</strong>
                  {!statusKey && <span>{event.label}</span>}
                </div>
                <span className="rhf-autosave-log__detail">
                  <EventDetail event={event} />
                </span>
              </div>
              <time dateTime={new Date(event.timestamp).toISOString()}>
                {formatTime(event.timestamp)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
