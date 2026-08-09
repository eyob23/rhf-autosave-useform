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
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutoSaveStatus } from "../../AutoSaveStatus";
import { useAutoSave } from "../../useAutoSave";
import { NavigationGuard } from "../NavigationGuard";

type Values = { name: string };

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

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(router.state.location.pathname).toBe("/edit");
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByRole("heading", { name: "Destination" }),
    ).toBeTruthy();
    expect(save).toHaveBeenCalledTimes(2);
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
