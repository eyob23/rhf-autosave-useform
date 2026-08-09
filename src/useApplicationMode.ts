import { useMatch } from "react-router-dom";

export function useIsViewMode() {
  return useMatch("/applications/:applicationId/view/*") !== null;
}
