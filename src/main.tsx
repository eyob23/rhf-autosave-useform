import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import {
  createBrowserRouter,
  createHashRouter,
  RouterProvider,
} from "react-router-dom";
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

const routes = [
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
];

const router =
  import.meta.env.BASE_URL === "/"
    ? createBrowserRouter(routes)
    : createHashRouter(routes);

const showApiSimulation =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_API_SIMULATOR === "true";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <AutoSaveStatusProvider>
        <RouterProvider router={router} />
        {showApiSimulation && <ApiSimulationPanel />}
      </AutoSaveStatusProvider>
    </Provider>
  </React.StrictMode>,
);
