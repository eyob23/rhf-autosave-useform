// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AutoSaveStatusProvider,
  AutoSaveStatusRegistration,
  RegisteredAutoSaveStatus,
  useAutoSaveLog,
  useClearAutoSaveLog,
  useTrackedAutoSaves,
} from "../AutoSaveStatusRegistry";
import type { AutoSaveController, AutoSaveSnapshot } from "../types";

function createController(initialSnapshot: AutoSaveSnapshot) {
  let snapshot = initialSnapshot;
  const listeners = new Set<() => void>();
  const controller: AutoSaveController = {
    initialize: vi.fn(),
    flush: vi.fn(async () => undefined),
    retry: vi.fn(async () => undefined),
    flushBestEffort: vi.fn(),
    hasUnsavedChanges: () => snapshot.state === "dirty",
    isInitialized: () => true,
    getSnapshot: () => snapshot,
    subscribeStatus: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return {
    controller,
    publish: (next: AutoSaveSnapshot) => {
      snapshot = next;
      listeners.forEach((listener) => listener());
    },
  };
}

const idleSnapshot: AutoSaveSnapshot = {
  state: "idle",
  lastSavedAt: null,
  saveDueAt: null,
  error: null,
};

function TrackedStatuses() {
  const statuses = useTrackedAutoSaves();
  return (
    <ul>
      {statuses.map(({ statusKey, label, snapshot, isActive }) => (
        <li key={statusKey}>
          {label}: {snapshot.state} ({isActive ? "active" : "retained"})
        </li>
      ))}
    </ul>
  );
}

function LogEvents({ statusKey }: { statusKey?: string }) {
  const events = useAutoSaveLog({ statusKey });
  const clearLog = useClearAutoSaveLog();
  return (
    <div>
      <button type="button" onClick={clearLog}>
        Clear
      </button>
      <ol>
        {events.map((event) => (
          <li key={event.id}>
            {event.label}: {event.type}
            {event.durationMs === undefined ? "" : ` (${event.durationMs}ms)`}
          </li>
        ))}
      </ol>
    </div>
  );
}

describe("autosave status registry", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("displays a registered form status and updates its countdown locally", () => {
    const source = createController(idleSnapshot);
    render(
      <AutoSaveStatusProvider>
        <RegisteredAutoSaveStatus statusKey="profile" />
        <AutoSaveStatusRegistration
          statusKey="profile"
          controller={source.controller}
        />
      </AutoSaveStatusProvider>,
    );

    expect(
      screen.getByText("Ready", { selector: "[aria-hidden=true]" }),
    ).toBeTruthy();

    act(() => {
      source.publish({
        state: "dirty",
        lastSavedAt: null,
        saveDueAt: Date.now() + 1000,
        error: null,
      });
    });
    expect(screen.getByText("Autosaving in 1.0s")).toBeTruthy();

    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByText("Autosaving in 0.5s")).toBeTruthy();
  });

  it("removes a status when its form unmounts", () => {
    const source = createController(idleSnapshot);
    const view = render(
      <AutoSaveStatusProvider>
        <RegisteredAutoSaveStatus
          statusKey="profile"
          fallback={<span>No active form</span>}
        />
        <AutoSaveStatusRegistration
          statusKey="profile"
          controller={source.controller}
        />
      </AutoSaveStatusProvider>,
    );

    view.rerender(
      <AutoSaveStatusProvider>
        <RegisteredAutoSaveStatus
          statusKey="profile"
          fallback={<span>No active form</span>}
        />
      </AutoSaveStatusProvider>,
    );

    expect(screen.getByText("No active form")).toBeTruthy();
  });

  it("lists live snapshots and retains the latest status when requested", () => {
    const source = createController(idleSnapshot);
    const view = render(
      <AutoSaveStatusProvider>
        <TrackedStatuses />
        <AutoSaveStatusRegistration
          statusKey="profile:1"
          label="Ada profile"
          controller={source.controller}
          retainOnUnmount
        />
      </AutoSaveStatusProvider>,
    );

    expect(screen.getByText("Ada profile: idle (active)")).toBeTruthy();

    act(() => {
      source.publish({
        state: "saved",
        lastSavedAt: Date.now(),
        saveDueAt: null,
        error: null,
      });
    });
    expect(screen.getByText("Ada profile: saved (active)")).toBeTruthy();

    view.rerender(
      <AutoSaveStatusProvider>
        <TrackedStatuses />
      </AutoSaveStatusProvider>,
    );

    expect(screen.getByText("Ada profile: saved (retained)")).toBeTruthy();
  });

  it("keeps a bounded, filterable log of state transitions", () => {
    vi.setSystemTime(new Date("2026-08-09T12:00:00Z"));
    const source = createController(idleSnapshot);
    render(
      <AutoSaveStatusProvider maxLogEntries={3}>
        <LogEvents statusKey="profile:1" />
        <AutoSaveStatusRegistration
          statusKey="profile:1"
          label="Ada profile"
          controller={source.controller}
        />
      </AutoSaveStatusProvider>,
    );

    act(() => {
      source.publish({
        state: "dirty",
        lastSavedAt: null,
        saveDueAt: Date.now() + 1000,
        error: null,
      });
      source.publish({
        state: "saving",
        lastSavedAt: null,
        saveDueAt: null,
        error: null,
      });
      vi.advanceTimersByTime(25);
      source.publish({
        state: "saved",
        lastSavedAt: Date.now(),
        saveDueAt: null,
        error: null,
      });
      source.publish({
        state: "error",
        lastSavedAt: Date.now(),
        saveDueAt: null,
        error: "Offline",
      });
    });

    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      "Ada profile: save-failed",
      "Ada profile: save-succeeded (25ms)",
      "Ada profile: save-started",
    ]);

    act(() => screen.getByRole("button", { name: "Clear" }).click());
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
