import { ArrowLeft } from "lucide-react";
import { Link, Navigate, NavLink, Outlet, useParams } from "react-router-dom";
import { applicationAutoSaveStatusKey } from "./integrations/applicationAutosave";
import { RegisteredAutoSaveStatus } from "./rhf-autosave";
import { useIsViewMode } from "./useApplicationMode";

export function AppLayout() {
  const { applicationId } = useParams();
  const isViewMode = useIsViewMode();

  return (
    <main className="shell">
      <header className="app-header">
        <div>
          <Link className="back-link" to="/">
            <ArrowLeft size={16} /> All forms
          </Link>
          <h1>{isViewMode ? "View application" : "Edit application"}</h1>
        </div>
        <div className="header-meta">
          <span className="application-id">Application: {applicationId}</span>
          <span className={`mode-badge ${isViewMode ? "view" : "edit"}`}>
            {isViewMode ? "Read only" : "Autosave on"}
          </span>
          {!isViewMode && (
            <RegisteredAutoSaveStatus
              statusKey={applicationAutoSaveStatusKey}
              fallback={<span className="save-status muted">Ready</span>}
            />
          )}
        </div>
      </header>

      <div className="layout">
        <nav className="sidebar" aria-label="Application sections">
          <NavLink to="personal">1. Personal</NavLink>
          <NavLink to="employment">2. Employment</NavLink>
          <NavLink to="education">3. Education</NavLink>
          <NavLink to="references">4. References</NavLink>
          <p className="sidebar-note">
            Sidebar navigation is protected by the same autosave flush guard.
          </p>
        </nav>
        <div className={`content ${isViewMode ? "view-mode" : ""}`}>
          <Outlet key={applicationId} />
        </div>
      </div>
    </main>
  );
}

export function RootRedirect() {
  return <Navigate to="personal" replace />;
}
