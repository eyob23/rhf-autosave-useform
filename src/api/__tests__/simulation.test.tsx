// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiSimulationPanel } from "../../components/ApiSimulationPanel";
import { mockApi } from "../mockApi";
import {
  apiSimulation,
  runSimulatedRequest,
  SimulatedApiError,
} from "../simulation";

describe("API simulation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    apiSimulation.reset();
  });

  afterEach(() => {
    cleanup();
    apiSimulation.reset();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("delays slow requests and respects cancellation", async () => {
    apiSimulation.setMode("slow");
    const execute = vi.fn(() => "saved");
    const request = runSimulatedRequest("save", undefined, execute, 650);

    await vi.advanceTimersByTimeAsync(4999);
    expect(execute).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await expect(request).resolves.toBe("saved");

    const abortController = new AbortController();
    const abortedRequest = runSimulatedRequest(
      "save",
      abortController.signal,
      execute,
      650,
    ).catch((error: unknown) => error);
    abortController.abort();

    expect(await abortedRequest).toMatchObject({ name: "AbortError" });
    expect(execute).toHaveBeenCalledOnce();
  });

  it("fails one save without affecting the following save", async () => {
    apiSimulation.setLatencyMs(0);
    apiSimulation.setFailNextSave(true);
    const execute = vi.fn(() => "saved");
    const failedRequest = runSimulatedRequest(
      "save",
      undefined,
      execute,
      650,
    ).catch((error: unknown) => error);
    await vi.runAllTimersAsync();

    expect(await failedRequest).toEqual(
      expect.objectContaining({
        message: "Simulated one-time save failure.",
        status: 503,
      }),
    );
    expect(apiSimulation.getSnapshot().failNextSave).toBe(false);
    expect(execute).not.toHaveBeenCalled();

    const recoveredRequest = runSimulatedRequest(
      "save",
      undefined,
      execute,
      650,
    );
    await vi.runAllTimersAsync();
    await expect(recoveredRequest).resolves.toBe("saved");
  });

  it("applies offline mode to saves and optionally to reads", async () => {
    apiSimulation.setMode("offline");

    await expect(
      runSimulatedRequest("save", undefined, () => "saved", 650),
    ).rejects.toEqual(expect.objectContaining({ status: "OFFLINE" }));

    const readRequest = runSimulatedRequest(
      "read",
      undefined,
      () => "loaded",
      250,
    );
    await vi.advanceTimersByTimeAsync(250);
    await expect(readRequest).resolves.toBe("loaded");

    apiSimulation.setAffectReads(true);
    await expect(
      runSimulatedRequest("read", undefined, () => "loaded", 250),
    ).rejects.toEqual(expect.objectContaining({ status: "OFFLINE" }));
  });

  it("supports deterministic flaky failures", async () => {
    apiSimulation.setMode("flaky");
    apiSimulation.setLatencyMs(0);
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const request = runSimulatedRequest(
      "save",
      undefined,
      () => "saved",
      650,
    ).catch((error: unknown) => error);
    await vi.runAllTimersAsync();

    expect(await request).toBeInstanceOf(SimulatedApiError);
  });

  it("does not mutate stored form data when a save fails", async () => {
    const applicationId = "simulation-test-application";
    const initialRequest = mockApi.getPersonal(applicationId);
    await vi.advanceTimersByTimeAsync(250);
    const initial = await initialRequest;
    const changed = { ...initial, firstName: "Changed" };

    apiSimulation.setLatencyMs(0);
    apiSimulation.setFailNextSave(true);
    const failedSave = mockApi
      .savePersonal(applicationId, changed, new AbortController().signal)
      .catch((error: unknown) => error);
    await vi.runAllTimersAsync();
    expect(await failedSave).toBeInstanceOf(SimulatedApiError);

    const reloadRequest = mockApi.getPersonal(applicationId);
    await vi.advanceTimersByTimeAsync(250);
    expect((await reloadRequest).firstName).toBe(initial.firstName);

    const cleanupRequest = mockApi.deleteApplication(applicationId);
    await vi.advanceTimersByTimeAsync(250);
    await cleanupRequest;
  });

  it("updates and resets scenarios from the developer panel", () => {
    render(<ApiSimulationPanel />);
    fireEvent.click(
      screen.getByRole("button", { name: "Open API simulation" }),
    );

    fireEvent.change(screen.getByLabelText("Scenario"), {
      target: { value: "offline" },
    });
    expect(apiSimulation.getSnapshot().mode).toBe("offline");
    expect(screen.getByText("Saves only")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Fail next save" }));
    expect(apiSimulation.getSnapshot().failNextSave).toBe(true);
    expect(
      screen.getByRole("button", { name: "Next save will fail" }),
    ).toBeTruthy();

    act(() =>
      screen.getByRole("button", { name: "Reset API simulation" }).click(),
    );
    expect(apiSimulation.getSnapshot()).toEqual(
      expect.objectContaining({
        mode: "normal",
        failNextSave: false,
        affectReads: false,
      }),
    );
  });
});
