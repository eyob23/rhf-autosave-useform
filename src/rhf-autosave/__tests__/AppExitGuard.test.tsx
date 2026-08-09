// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppExitGuard } from "../AppExitGuard";
import type { AutoSaveController } from "../types";

const createController = (hasUnsavedChanges: boolean) =>
  ({
    flushBestEffort: vi.fn(),
    hasUnsavedChanges: () => hasUnsavedChanges,
  }) as unknown as AutoSaveController;

describe("AppExitGuard", () => {
  afterEach(cleanup);

  it("flushes and prevents unload when changes are unsaved", () => {
    const controller = createController(true);
    render(<AppExitGuard controller={controller} />);
    const event = new Event("beforeunload", { cancelable: true });

    window.dispatchEvent(event);

    expect(controller.flushBestEffort).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it("flushes on page hide and removes listeners after unmount", () => {
    const controller = createController(true);
    const view = render(<AppExitGuard controller={controller} />);

    window.dispatchEvent(new Event("pagehide"));
    expect(controller.flushBestEffort).toHaveBeenCalledOnce();

    view.unmount();
    window.dispatchEvent(new Event("pagehide"));
    expect(controller.flushBestEffort).toHaveBeenCalledOnce();
  });
});
