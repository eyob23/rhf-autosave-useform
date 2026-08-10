import { useEffect, useId, useRef } from "react";
import { useBlocker } from "react-router-dom";
import type { AutoSaveController } from "../types";
import { useAutoSaveSnapshot } from "../useAutoSaveSnapshot";
import "./NavigationGuard.css";

type Props = { controller: AutoSaveController };

/**
 * Block route changes until pending autosave work is flushed or the user
 * explicitly chooses to stay on the current page.
 */
export function NavigationGuard({ controller }: Props) {
  const flushingRef = useRef(false);
  const waitingForRetryRef = useRef(false);
  const attemptRef = useRef(0);
  const titleId = useId();
  const descriptionId = useId();
  const snapshot = useAutoSaveSnapshot(controller);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search ||
        currentLocation.hash !== nextLocation.hash) &&
      controller.hasUnsavedChanges(),
  );

  useEffect(() => {
    if (blocker.state !== "blocked") {
      flushingRef.current = false;
      waitingForRetryRef.current = false;
      return;
    }

    if (waitingForRetryRef.current) {
      if (snapshot.state === "saved") {
        waitingForRetryRef.current = false;
        blocker.proceed();
      }
      return;
    }

    if (flushingRef.current) return;

    flushingRef.current = true;
    const attempt = ++attemptRef.current;
    void controller
      .flush()
      .then(() => {
        if (attempt === attemptRef.current && blocker.state === "blocked") {
          blocker.proceed();
        }
      })
      .catch(() => {
        if (attempt === attemptRef.current) {
          waitingForRetryRef.current = true;
        }
      })
      .finally(() => {
        if (attempt === attemptRef.current) {
          flushingRef.current = false;
        }
      });
  }, [blocker, controller, snapshot.state]);

  if (blocker.state !== "blocked") return null;

  const hasError = snapshot.state === "error";
  const stayHere = () => {
    // Cancel this navigation attempt so a later save completion cannot resume it.
    attemptRef.current += 1;
    flushingRef.current = false;
    waitingForRetryRef.current = false;
    blocker.reset();
  };
  const retryAndContinue = () => {
    // Retry keeps the navigation blocked until the autosave succeeds.
    waitingForRetryRef.current = true;
    void controller.retry().catch(() => {
      // The controller publishes the error for this notice and status UI.
    });
  };
  const navigateWithoutSaving = () => {
    // Skip autosave for this attempt and continue immediately.
    attemptRef.current += 1;
    flushingRef.current = false;
    waitingForRetryRef.current = false;
    blocker.proceed();
  };

  return (
    <div
      className={`rhf-autosave-navigation-guard ${hasError ? "is-error" : "is-saving"}`}
      role={hasError ? "alertdialog" : "status"}
      aria-live={hasError ? "assertive" : "polite"}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <span className="rhf-autosave-navigation-guard__icon" aria-hidden="true">
        {hasError ? (
          "!"
        ) : (
          <span className="rhf-autosave-navigation-guard__spinner" />
        )}
      </span>
      <div className="rhf-autosave-navigation-guard__content">
        <strong id={titleId}>
          {hasError
            ? "Navigation paused: changes weren't saved"
            : "Saving changes before leaving"}
        </strong>
        <span id={descriptionId}>
          {hasError
            ? snapshot.error || "Save failed. Retry or stay on this page."
            : "Your destination will open as soon as the save completes."}
        </span>
      </div>
      <div className="rhf-autosave-navigation-guard__actions">
        <button
          type="button"
          className="is-secondary"
          onClick={navigateWithoutSaving}
        >
          Navigate without saving
        </button>
        {hasError && (
          <button type="button" onClick={retryAndContinue} autoFocus>
            Retry and continue
          </button>
        )}
        <button type="button" className="is-secondary" onClick={stayHere}>
          Stay here
        </button>
      </div>
    </div>
  );
}
