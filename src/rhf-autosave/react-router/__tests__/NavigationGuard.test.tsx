// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { createMemoryRouter, Link, RouterProvider } from "react-router-dom";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutoSaveStatus } from "../../AutoSaveStatus";
import { useAutoSave } from "../../useAutoSave";
import { NavigationGuard } from "../NavigationGuard";

type Values = { name: string };

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function Editor({
  save,
  destination = "/destination",
}: {
  save: (values: Values) => Promise<void>;
  destination?: string;
}) {
  const form = useForm<Values>({ defaultValues: { name: "Ada" } });
  const controller = useAutoSave({ form, save });

  useEffect(() => {
    form.reset({ name: "Ada" });
    controller.initialize();
  }, [controller, form]);

  return (
    <FormProvider {...form}>
      <NavigationGuard controller={controller} />
      <AutoSaveStatus controller={controller} />
      <input aria-label="Name" {...form.register("name")} />
      <Link to={destination}>Leave editor</Link>
    </FormProvider>
  );
}

describe("NavigationGuard", () => {
  afterEach(cleanup);

  it("stays blocked after failure and proceeds after a successful retry", async () => {
    const save = vi
      .fn<(values: Values) => Promise<void>>()
      .mockRejectedValueOnce(new Error("Service unavailable"))
      .mockResolvedValue(undefined);
    const router = createMemoryRouter(
      [
        { path: "/edit", element: <Editor save={save} /> },
        { path: "/destination", element: <h1>Destination</h1> },
      ],
      { initialEntries: ["/edit"] },
    );
    render(<RouterProvider router={router} />);

    fireEvent.change(await screen.findByRole("textbox", { name: "Name" }), {
      target: { value: "Grace" },
    });
    fireEvent.click(screen.getByRole("link", { name: "Leave editor" }));

    const notice = await screen.findByRole("alertdialog", {
      name: "Navigation paused: changes weren't saved",
    });
    expect(notice.textContent).toContain("Service unavailable");
    expect(router.state.location.pathname).toBe("/edit");
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Retry and continue" }));

    expect(
      await screen.findByRole("heading", { name: "Destination" }),
    ).toBeTruthy();
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("explains that navigation is waiting for an in-flight save", async () => {
    const pendingSave = deferred<void>();
    const save = vi.fn(() => pendingSave.promise);
    const router = createMemoryRouter(
      [
        { path: "/edit", element: <Editor save={save} /> },
        { path: "/destination", element: <h1>Destination</h1> },
      ],
      { initialEntries: ["/edit"] },
    );
    render(<RouterProvider router={router} />);

    fireEvent.change(await screen.findByRole("textbox", { name: "Name" }), {
      target: { value: "Grace" },
    });
    fireEvent.click(screen.getByRole("link", { name: "Leave editor" }));

    expect(
      await screen.findByText("Saving changes before leaving"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Your destination will open as soon as the save completes.",
      ),
    ).toBeTruthy();
    expect(router.state.location.pathname).toBe("/edit");

    await act(async () => pendingSave.resolve());
    expect(
      await screen.findByRole("heading", { name: "Destination" }),
    ).toBeTruthy();
  });

  it("stays on the form when the blocked navigation is cancelled", async () => {
    const pendingSave = deferred<void>();
    const save = vi.fn(() => pendingSave.promise);
    const router = createMemoryRouter(
      [
        { path: "/edit", element: <Editor save={save} /> },
        { path: "/destination", element: <h1>Destination</h1> },
      ],
      { initialEntries: ["/edit"] },
    );
    render(<RouterProvider router={router} />);

    fireEvent.change(await screen.findByRole("textbox", { name: "Name" }), {
      target: { value: "Grace" },
    });
    fireEvent.click(screen.getByRole("link", { name: "Leave editor" }));
    fireEvent.click(await screen.findByRole("button", { name: "Stay here" }));

    await act(async () => pendingSave.resolve());
    expect(router.state.location.pathname).toBe("/edit");
    expect(screen.queryByText("Saving changes before leaving")).toBeNull();
  });

  it("flushes before same-path query navigation", async () => {
    const save = vi.fn(async (_values: Values) => undefined);
    const router = createMemoryRouter(
      [
        {
          path: "/edit",
          element: <Editor save={save} destination="/edit?tab=next" />,
        },
      ],
      { initialEntries: ["/edit?tab=current"] },
    );
    render(<RouterProvider router={router} />);

    fireEvent.change(await screen.findByRole("textbox", { name: "Name" }), {
      target: { value: "Grace" },
    });
    fireEvent.click(screen.getByRole("link", { name: "Leave editor" }));

    await waitFor(() => expect(router.state.location.search).toBe("?tab=next"));
    expect(save).toHaveBeenCalledOnce();
  });
});
