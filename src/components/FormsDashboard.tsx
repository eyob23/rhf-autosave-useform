import { useDeferredValue, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Eye,
  FilePlus2,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  useCreateApplicationMutation,
  useDeleteApplicationMutation,
  useGetApplicationsQuery,
} from "../api/service";
import type { ApplicationStatus, ApplicationSummary } from "../api/mockApi";
import { AutoSaveEventLog, TrackedAutoSaveList } from "../rhf-autosave";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type DeleteDialogProps = {
  application: ApplicationSummary;
  error: string | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  returnFocusTo: HTMLElement | null;
};

function DeleteDialog({
  application,
  error,
  isDeleting,
  onCancel,
  onConfirm,
  returnFocusTo,
}: DeleteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();

    return () => {
      if (dialog?.open) dialog.close();
      returnFocusTo?.focus();
    };
  }, [returnFocusTo]);

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!isDeleting) onCancel();
      }}
      onMouseDown={(event) => {
        if (isDeleting) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const clickedOutside =
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom;
        if (clickedOutside) onCancel();
      }}
    >
      <button
        className="dialog-close"
        type="button"
        onClick={onCancel}
        disabled={isDeleting}
        aria-label="Close dialog"
      >
        <X size={19} />
      </button>
      <span className="dialog-icon" aria-hidden="true">
        <Trash2 size={22} />
      </span>
      <h2 id="delete-title">Delete this form?</h2>
      <p id="delete-description">
        {application.applicantName}&apos;s application will be permanently
        removed.
      </p>
      {error && (
        <p className="dashboard-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button
          className="button secondary"
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
          autoFocus
        >
          Cancel
        </button>
        <button
          className="button danger-button"
          type="button"
          disabled={isDeleting}
          onClick={onConfirm}
        >
          {isDeleting ? "Deleting..." : "Delete form"}
        </button>
      </div>
    </dialog>
  );
}

export function FormsDashboard() {
  const navigate = useNavigate();
  const {
    data: applications = [],
    isError: isApplicationsError,
    isLoading,
    refetch,
  } = useGetApplicationsQuery();
  const [createApplication, createState] = useCreateApplicationMutation();
  const [deleteApplication, deleteState] = useDeleteApplicationMutation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ApplicationStatus | "All">("All");
  const [pendingDelete, setPendingDelete] = useState<ApplicationSummary | null>(
    null,
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteTriggerRef = useRef<HTMLElement | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const filteredApplications = applications.filter((application) => {
    const matchesStatus = status === "All" || application.status === status;
    const matchesQuery =
      !deferredQuery ||
      `${application.title} ${application.applicantName} ${application.email}`
        .toLowerCase()
        .includes(deferredQuery);
    return matchesStatus && matchesQuery;
  });

  const completedCount = applications.filter(
    (application) => application.status === "Complete",
  ).length;

  const handleCreate = async () => {
    setCreateError(null);
    try {
      const application = await createApplication().unwrap();
      navigate(`/applications/${application.id}/personal`);
    } catch {
      setCreateError("Couldn't create the form. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleteError(null);
    try {
      await deleteApplication(pendingDelete.id).unwrap();
      setPendingDelete(null);
    } catch {
      setDeleteError("Couldn't delete the form. Please try again.");
    }
  };

  const openDeleteDialog = (
    application: ApplicationSummary,
    trigger: HTMLElement,
  ) => {
    deleteTriggerRef.current = trigger;
    setDeleteError(null);
    setPendingDelete(application);
  };

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Link className="brand" to="/" aria-label="Formspace dashboard">
          <span className="brand-mark">
            <BriefcaseBusiness size={20} />
          </span>
          <span>Formspace</span>
        </Link>
        <button
          className="button create-button"
          type="button"
          onClick={() => void handleCreate()}
          disabled={createState.isLoading}
        >
          <FilePlus2 size={18} />
          {createState.isLoading ? "Creating..." : "Create form"}
        </button>
      </header>

      {createError && (
        <p className="dashboard-error dashboard-banner" role="alert">
          {createError}
        </p>
      )}

      <section className="dashboard-intro" aria-labelledby="dashboard-title">
        <div>
          <span className="eyebrow">Application workspace</span>
          <h1 id="dashboard-title">Forms</h1>
          <p>Review, update, and manage every candidate application.</p>
        </div>
        <div className="dashboard-stats" aria-label="Application totals">
          <div>
            <strong>{applications.length}</strong>
            <span>Total forms</span>
          </div>
          <div>
            <strong>{completedCount}</strong>
            <span>Complete</span>
          </div>
          <div>
            <strong>{applications.length - completedCount}</strong>
            <span>In progress</span>
          </div>
        </div>
      </section>

      <TrackedAutoSaveList
        className="dashboard-autosave-tracker"
        eyebrow="This browser session"
        emptyMessage="Autosaves appear here after you edit an application section."
      />

      <AutoSaveEventLog
        className="dashboard-autosave-log"
        eyebrow="Developer log"
        emptyMessage="Autosave events appear here as forms are edited."
      />

      <section className="dashboard-tools" aria-label="Filter forms">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search forms</span>
          <input
            type="search"
            placeholder="Search by applicant, role, or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="status-filter">
          <span>Status</span>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as ApplicationStatus | "All")
            }
          >
            <option>All</option>
            <option>Draft</option>
            <option>In review</option>
            <option>Complete</option>
          </select>
        </label>
      </section>

      {isLoading ? (
        <div className="dashboard-state">
          <span className="spinner" /> Loading forms...
        </div>
      ) : isApplicationsError ? (
        <div className="dashboard-state" role="alert">
          <h2>Couldn&apos;t load forms</h2>
          <p>Check your connection and try again.</p>
          <button className="button secondary" type="button" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="dashboard-state">
          <h2>No forms found</h2>
          <p>Adjust the search or status filter to see more results.</p>
        </div>
      ) : (
        <section className="forms-grid" aria-label="Forms">
          {filteredApplications.map((application) => (
            <article className="form-card" key={application.id}>
              <div className="form-card-topline">
                <span
                  className={`status-badge status-${application.status.toLowerCase().replace(" ", "-")}`}
                >
                  {application.status}
                </span>
                <span className="form-date">
                  Updated{" "}
                  {dateFormatter.format(new Date(application.updatedAt))}
                </span>
              </div>
              <div className="form-card-body">
                <span className="applicant-initials" aria-hidden="true">
                  {application.applicantName
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div>
                  <h2>{application.title}</h2>
                  <p className="applicant-name">{application.applicantName}</p>
                  <p className="applicant-email">
                    {application.email || "Email not added"}
                  </p>
                </div>
              </div>
              <div className="form-card-actions">
                <Link
                  className="primary-card-action"
                  to={`/applications/${application.id}/personal`}
                >
                  Edit form <ArrowUpRight size={16} />
                </Link>
                <div className="icon-actions">
                  <Link
                    className="icon-button"
                    to={`/applications/${application.id}/view/personal`}
                    aria-label={`View ${application.applicantName}'s form`}
                    title="View form"
                  >
                    <Eye size={18} />
                  </Link>
                  <Link
                    className="icon-button"
                    to={`/applications/${application.id}/personal`}
                    aria-label={`Edit ${application.applicantName}'s form`}
                    title="Edit form"
                  >
                    <Pencil size={18} />
                  </Link>
                  <button
                    className="icon-button danger-icon"
                    type="button"
                    onClick={(event) =>
                      openDeleteDialog(application, event.currentTarget)
                    }
                    aria-label={`Delete ${application.applicantName}'s form`}
                    title="Delete form"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      <footer className="dashboard-footer">
        Showing {filteredApplications.length} of {applications.length} forms
      </footer>

      {pendingDelete && (
        <DeleteDialog
          application={pendingDelete}
          error={deleteError}
          isDeleting={deleteState.isLoading}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void handleDelete()}
          returnFocusTo={deleteTriggerRef.current}
        />
      )}
    </main>
  );
}
