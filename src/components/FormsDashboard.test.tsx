// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { ApplicationSummary } from "../api/mockApi";
import {
  AutoSaveStatusProvider,
  AutoSaveStatusRegistration,
  type AutoSaveController,
  type AutoSaveSnapshot,
} from "../rhf-autosave";
import { FormsDashboard } from "./FormsDashboard";

const api = vi.hoisted(() => ({
  createApplication: vi.fn(),
  deleteApplication: vi.fn(),
  refetch: vi.fn(),
  applications: [] as ApplicationSummary[],
  isError: false,
}));

vi.mock("../api/service", () => ({
  useGetApplicationsQuery: () => ({
    data: api.applications,
    isError: api.isError,
    isLoading: false,
    refetch: api.refetch,
  }),
  useCreateApplicationMutation: () => [
    api.createApplication,
    { isLoading: false },
  ],
  useDeleteApplicationMutation: () => [
    api.deleteApplication,
    { isLoading: false },
  ],
}));

const application: ApplicationSummary = {
  id: "application-001",
  title: "Software Engineer",
  applicantName: "Ada Lovelace",
  email: "ada@example.com",
  status: "Draft",
  updatedAt: "2026-08-09T12:00:00.000Z",
};

const renderDashboard = (registrations?: React.ReactNode) =>
  render(
    <AutoSaveStatusProvider>
      <MemoryRouter>
        <FormsDashboard />
        {registrations}
      </MemoryRouter>
    </AutoSaveStatusProvider>,
  );

const createController = (snapshot: AutoSaveSnapshot): AutoSaveController => ({
  initialize: vi.fn(),
  flush: vi.fn(async () => undefined),
  retry: vi.fn(async () => undefined),
  flushBestEffort: vi.fn(),
  hasUnsavedChanges: () => false,
  isInitialized: () => true,
  getSnapshot: () => snapshot,
  subscribeStatus: () => () => undefined,
});

describe("FormsDashboard", () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
  });

  beforeEach(() => {
    api.applications = [];
    api.isError = false;
    api.createApplication.mockReset();
    api.deleteApplication.mockReset();
    api.refetch.mockReset();
  });

  afterEach(cleanup);

  it("shows a retryable error instead of an empty state when loading fails", () => {
    api.isError = true;
    renderDashboard();

    expect(screen.getByRole("alert").textContent).toContain(
      "Couldn't load forms",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(api.refetch).toHaveBeenCalledOnce();
  });

  it("reports create failures", async () => {
    api.createApplication.mockReturnValue({
      unwrap: () => Promise.reject(new Error("Unavailable")),
    });
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Create form" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Couldn't create the form",
    );
  });

  it("reports delete failures without closing the dialog", async () => {
    api.applications = [application];
    api.deleteApplication.mockReturnValue({
      unwrap: () => Promise.reject(new Error("Unavailable")),
    });
    renderDashboard();

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Ada Lovelace's form" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete form" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Couldn't delete the form",
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("closes on cancel and restores focus to the delete trigger", async () => {
    api.applications = [application];
    renderDashboard();
    const trigger = screen.getByRole("button", {
      name: "Delete Ada Lovelace's form",
    });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog");
    fireEvent(dialog, new Event("cancel", { cancelable: true }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("shows every autosave registered in the current session", async () => {
    const savedController = createController({
      state: "saved",
      lastSavedAt: Date.now(),
      saveDueAt: null,
      error: null,
    });
    const errorController = createController({
      state: "error",
      lastSavedAt: null,
      saveDueAt: null,
      error: "Connection unavailable",
    });

    renderDashboard(
      <>
        <AutoSaveStatusRegistration
          statusKey="application:001:personal"
          label="application-001 · Personal"
          controller={savedController}
        />
        <AutoSaveStatusRegistration
          statusKey="application:002:education"
          label="application-002 · Education"
          controller={errorController}
        />
      </>,
    );

    expect(await screen.findByLabelText("2 tracked autosaves")).toBeTruthy();
    expect(screen.getByText("application-001 · Personal")).toBeTruthy();
    expect(screen.getByText("application-002 · Education")).toBeTruthy();
    expect(screen.getByText("Connection unavailable")).toBeTruthy();
  });
});
