import { isRouteErrorResponse, useRouteError } from "react-router-dom";

export function RouteErrorBoundary() {
  const error = useRouteError();
  let message = "Unexpected application error.";
  if (isRouteErrorResponse(error)) message = `${error.status} ${error.statusText}`;
  else if (error instanceof Error) message = error.message;

  return <main className="shell"><section className="card error-panel"><h2>Application error</h2><pre>{message}</pre></section></main>;
}
