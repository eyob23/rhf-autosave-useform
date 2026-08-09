// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutoSaveEventLog } from "../AutoSaveEventLog";
import {
  AutoSaveStatusProvider,
  AutoSaveStatusRegistration,
  useAutoSaveLog,
} from "../AutoSaveStatusRegistry";
import type { AutoSaveController, AutoSaveSnapshot } from "../types";

const idleSnapshot: AutoSaveSnapshot = {
  state: "idle",
  lastSavedAt: null,
  saveDueAt: null,
  error: null,
};

function createController() {
  let snapshot = idleSnapshot;
  const listeners = new Set<() => void>();
  const controller: AutoSaveController = {
    initialize: vi.fn(),
    flush: vi.fn(async () => undefined),
    retry: vi.fn(async () => undefined),
    flushBestEffort: vi.fn(),
    hasUnsavedChanges: () => snapshot.state === "dirty",
    isInitialized: () => true,
    getSnapshot: () => snapshot,
    subscribeStatus: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return {
    controller,
    publish(next: AutoSaveSnapshot) {
      snapshot = next;
      listeners.forEach((listener) => listener());
    },
  };
}

function GlobalEventCount() {
  return <output data-testid="global-count">{useAutoSaveLog().length}</output>;
}

describe("AutoSaveEventLog", () => {
  afterEach(cleanup);

  it("filters events by form and clears only that form's history", () => {
    const profile = createController();
    const education = createController();
    render(
      <AutoSaveStatusProvider>
        <GlobalEventCount />
        <AutoSaveEventLog
          statusKey="profile:1"
          title="Profile activity"
          formatTime={() => "12:00 PM"}
        />
        <AutoSaveStatusRegistration
          statusKey="profile:1"
          label="Ada profile"
          controller={profile.controller}
        />
        <AutoSaveStatusRegistration
          statusKey="education:1"
          label="Ada education"
          controller={education.controller}
        />
      </AutoSaveStatusProvider>,
    );

    act(() => {
      profile.publish({
        state: "dirty",
        lastSavedAt: null,
        saveDueAt: Date.now() + 1000,
        error: null,
      });
      profile.publish({
        state: "saving",
        lastSavedAt: null,
        saveDueAt: null,
        error: null,
      });
      profile.publish({
        state: "error",
        lastSavedAt: null,
        saveDueAt: null,
        error: "Connection unavailable",
      });
      education.publish({
        state: "dirty",
        lastSavedAt: null,
        saveDueAt: Date.now() + 1000,
        error: null,
      });
    });

    expect(
      screen.getByRole("heading", { name: "Profile activity" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("3 autosave log events")).toBeTruthy();
    expect(screen.getByText("Connection unavailable")).toBeTruthy();
    expect(screen.getAllByText("12:00 PM")).toHaveLength(3);
    expect(screen.getByTestId("global-count").textContent).toBe("4");

    act(() => screen.getByRole("button", { name: "Clear log" }).click());

    expect(
      screen.getByText("No autosave activity in this session."),
    ).toBeTruthy();
    expect(screen.getByTestId("global-count").textContent).toBe("1");
  });
});
