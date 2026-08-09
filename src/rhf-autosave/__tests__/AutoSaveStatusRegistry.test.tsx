// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AutoSaveStatusProvider,
  AutoSaveStatusRegistration,
  RegisteredAutoSaveStatus,
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
});
