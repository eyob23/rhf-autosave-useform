// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoSave } from "../useAutoSave";

type TestValues = {
  profile: { name: string };
};

const initialValues = (): TestValues => ({ profile: { name: "Ada" } });

function useHarness(
  save: (values: TestValues, signal: AbortSignal) => Promise<void>,
  requestTimeoutMs = 1000,
) {
  const form = useForm<TestValues>({ defaultValues: initialValues() });
  const controller = useAutoSave({
    form,
    save,
    debounceMs: 10,
    requestTimeoutMs,
  });

  useEffect(() => {
    form.reset(initialValues());
    controller.initialize();
  }, [controller, form]);

  return { controller, form };
}

describe("useAutoSave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("saves immutable snapshots and follows up with newer revisions", async () => {
    const snapshots: TestValues[] = [];
    const resolvers: Array<() => void> = [];
    const save = vi.fn(
      (values: TestValues) =>
        new Promise<void>((resolve) => {
          snapshots.push(values);
          resolvers.push(resolve);
        }),
    );
    const { result, unmount } = renderHook(() => useHarness(save));

    act(() => result.current.form.setValue("profile.name", "Grace"));
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(snapshots[0].profile.name).toBe("Grace");

    act(() => result.current.form.setValue("profile.name", "Katherine"));
    expect(snapshots[0].profile.name).toBe("Grace");

    await act(async () => {
      resolvers[0]();
      await Promise.resolve();
    });
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(snapshots[1].profile.name).toBe("Katherine");

    await act(async () => {
      resolvers[1]();
      await result.current.controller.flush();
    });
    expect(result.current.controller.hasUnsavedChanges()).toBe(false);
    unmount();
  });

  it("times out and aborts a hanging save", async () => {
    let wasAborted = false;
    const save = vi.fn(
      (_values: TestValues, signal: AbortSignal) =>
        new Promise<void>((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            wasAborted = true;
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    const { result, unmount } = renderHook(() => useHarness(save, 50));

    act(() => result.current.form.setValue("profile.name", "Grace"));
    await act(() => vi.advanceTimersByTimeAsync(60));

    expect(wasAborted).toBe(true);
    expect(result.current.controller.getSnapshot()).toMatchObject({
      state: "error",
      error: "Autosave timed out. Check your connection and retry.",
    });
    unmount();
  });

  it("aborts an active save when the form unmounts", async () => {
    let wasAborted = false;
    const save = vi.fn(
      (_values: TestValues, signal: AbortSignal) =>
        new Promise<void>((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            wasAborted = true;
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    const { result, unmount } = renderHook(() => useHarness(save));

    act(() => result.current.form.setValue("profile.name", "Grace"));
    await act(() => vi.advanceTimersByTimeAsync(10));
    unmount();
    await Promise.resolve();

    expect(wasAborted).toBe(true);
  });

  it("publishes snapshot and structured backend errors", async () => {
    const snapshotError = new Error("Unsupported form value");
    const throwingSnapshot = (_values: TestValues): TestValues => {
      throw snapshotError;
    };
    const cloneSnapshot = (values: TestValues): TestValues =>
      structuredClone(values);
    const save = vi.fn(async () => {
      throw { data: "Validation failed" };
    });
    const { result, rerender } = renderHook(
      ({ snapshot }: { snapshot: (values: TestValues) => TestValues }) => {
        const form = useForm<TestValues>({ defaultValues: initialValues() });
        const controller = useAutoSave({
          form,
          save,
          snapshot,
          debounceMs: 10,
        });
        useEffect(() => controller.initialize(), [controller]);
        return { controller, form };
      },
      { initialProps: { snapshot: throwingSnapshot } },
    );

    act(() => result.current.form.setValue("profile.name", "Grace"));
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(result.current.controller.getSnapshot().error).toBe(
      "Unsupported form value",
    );

    rerender({ snapshot: cloneSnapshot });
    await act(async () => {
      await result.current.controller.retry().catch(() => undefined);
    });
    expect(result.current.controller.getSnapshot().error).toBe(
      "Validation failed",
    );
  });

  it("force-saves the current form values even when nothing is dirty", async () => {
    const snapshots: TestValues[] = [];
    const save = vi.fn(async (values: TestValues) => {
      snapshots.push(values);
    });
    const { result } = renderHook(() => useHarness(save));

    await act(async () => {
      await result.current.controller.forceSave();
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(snapshots[0]).toEqual(initialValues());
    expect(result.current.controller.getSnapshot()).toMatchObject({
      state: "saved",
      error: null,
    });
  });
});
