// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoSaveForm } from "../useAutoSaveForm";

type Values = { name: string };

describe("useAutoSaveForm", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("initializes fetched values without saving and autosaves later edits", async () => {
    const save = vi.fn(async (_values: Values) => undefined);
    const { result } = renderHook(() =>
      useAutoSaveForm({
        defaultValues: { name: "" },
        values: { name: "Ada" },
        debounceMs: 10,
        save,
      }),
    );

    expect(result.current.form.getValues()).toEqual({ name: "Ada" });
    expect(save).not.toHaveBeenCalled();

    act(() => result.current.form.setValue("name", "Grace"));
    await act(() => vi.advanceTimersByTimeAsync(10));

    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0]).toEqual({ name: "Grace" });
  });

  it("adopts clean refetches and preserves dirty local edits", () => {
    const save = vi.fn(async (_values: Values) => undefined);
    const { result, rerender } = renderHook(
      ({ values }) =>
        useAutoSaveForm({
          defaultValues: { name: "" },
          values,
          debounceMs: 10,
          save,
        }),
      { initialProps: { values: { name: "Ada" } } },
    );

    rerender({ values: { name: "Grace" } });
    expect(result.current.form.getValues()).toEqual({ name: "Grace" });

    act(() => result.current.form.setValue("name", "Local edit"));
    rerender({ values: { name: "Server refresh" } });

    expect(result.current.form.getValues()).toEqual({ name: "Local edit" });
  });
});
