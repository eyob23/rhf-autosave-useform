import { useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";
import type { AutoSaveController } from "../types";
import { useAutoSaveSnapshot } from "../useAutoSaveSnapshot";

type Props = { controller: AutoSaveController };

export function NavigationGuard({ controller }: Props) {
  const flushingRef = useRef(false);
  const waitingForRetryRef = useRef(false);
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
    void controller
      .flush()
      .then(() => {
        if (blocker.state === "blocked") blocker.proceed();
      })
      .catch(() => {
        waitingForRetryRef.current = true;
      })
      .finally(() => {
        flushingRef.current = false;
      });
  }, [blocker, controller, snapshot.state]);

  return null;
}
