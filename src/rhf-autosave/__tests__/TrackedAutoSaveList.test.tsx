// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AutoSaveStatusProvider,
  AutoSaveStatusRegistration,
} from "../AutoSaveStatusRegistry";
import { TrackedAutoSaveList } from "../TrackedAutoSaveList";
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
    subscribeStatus: (listener) => {
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

describe("TrackedAutoSaveList", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders customizable heading and empty content", () => {
    render(
      <AutoSaveStatusProvider>
        <TrackedAutoSaveList
          title="Draft activity"
          eyebrow="Current session"
          emptyMessage="No drafts yet"
        />
      </AutoSaveStatusProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Draft activity" }),
    ).toBeTruthy();
    expect(screen.getByText("Current session")).toBeTruthy();
    expect(screen.getByText("No drafts yet")).toBeTruthy();
  });

  it("renders registered forms and updates the debounce countdown", () => {
    const source = createController({
      state: "idle",
      lastSavedAt: null,
      saveDueAt: null,
      error: null,
    });
    render(
      <AutoSaveStatusProvider>
        <TrackedAutoSaveList activeLabel="Editing" />
        <AutoSaveStatusRegistration
          statusKey="profile:1"
          label="Ada profile"
          controller={source.controller}
        />
      </AutoSaveStatusProvider>,
    );

    expect(screen.getByText("Ada profile")).toBeTruthy();
    expect(screen.getByText("Editing")).toBeTruthy();

    act(() => {
      source.publish({
        state: "dirty",
        lastSavedAt: null,
        saveDueAt: Date.now() + 1000,
        error: null,
      });
    });
    expect(screen.getByText("Autosaving in 1s")).toBeTruthy();

    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByText("Autosaving in 1s")).toBeTruthy();

    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByText("Autosaving in 0s")).toBeTruthy();
  });
});
