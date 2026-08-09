import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout, RootRedirect } from "./App";
import { FormsDashboard } from "./components/FormsDashboard";
import { ApiSimulationPanel } from "./components/ApiSimulationPanel";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import { EducationSection } from "./sections/EducationSection";
import { EmploymentSection } from "./sections/EmploymentSection";
import { PersonalSection } from "./sections/PersonalSection";
import { ReferencesSection } from "./sections/ReferencesSection";
import { AutoSaveStatusProvider } from "./rhf-autosave";
import { store } from "./store";
import "./styles.css";

const router = createBrowserRouter([
  { path: "/", element: <FormsDashboard /> },
  {
    path: "/applications/:applicationId",
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <RootRedirect /> },
      { path: "personal", element: <PersonalSection /> },
      { path: "employment", element: <EmploymentSection /> },
      { path: "education", element: <EducationSection /> },
      { path: "references", element: <ReferencesSection /> },
    ],
  },
  {
    path: "/applications/:applicationId/view",
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <RootRedirect /> },
      { path: "personal", element: <PersonalSection /> },
      { path: "employment", element: <EmploymentSection /> },
      { path: "education", element: <EducationSection /> },
      { path: "references", element: <ReferencesSection /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <AutoSaveStatusProvider>
        <RouterProvider router={router} />
        {import.meta.env.DEV && <ApiSimulationPanel />}
      </AutoSaveStatusProvider>
    </Provider>
  </React.StrictMode>,
);
