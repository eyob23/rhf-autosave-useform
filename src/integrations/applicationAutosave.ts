import type {
  EducationForm,
  EmploymentForm,
  PersonalForm,
  ReferencesForm,
} from "../api/forms";
import type { FieldValues } from "react-hook-form";
import type { AutoSaveFunction } from "../rhf-autosave";
import { store } from "../store";
import { applicationApi } from "../api/service";

export const applicationSectionNames = [
  "personal",
  "employment",
  "education",
  "references",
] as const;

export type ApplicationSectionName = (typeof applicationSectionNames)[number];

export const applicationAutoSaveStatusKey = (
  applicationId: string,
  section: ApplicationSectionName,
) => `application:${applicationId}:${section}`;

export const applicationAutoSaveStatusLabel = (
  applicationId: string,
  section: ApplicationSectionName,
) => `${applicationId} · ${section[0].toUpperCase()}${section.slice(1)}`;

type AbortableRequest = {
  abort: () => void;
  unwrap: () => Promise<unknown>;
};

async function runRequest(request: AbortableRequest, signal: AbortSignal) {
  const abort = () => request.abort();
  if (signal.aborted) abort();
  else signal.addEventListener("abort", abort, { once: true });

  try {
    await request.unwrap();
  } finally {
    signal.removeEventListener("abort", abort);
  }
}

type RequestFactory<T extends FieldValues> = (
  applicationId: string,
  values: T,
) => AbortableRequest;

function createApplicationSaver<T extends FieldValues>(
  createRequest: RequestFactory<T>,
) {
  return (applicationId: string): AutoSaveFunction<T> =>
    (values, signal) =>
      runRequest(createRequest(applicationId, values), signal);
}

export const applicationSavers = {
  personal: createApplicationSaver<PersonalForm>((applicationId, values) =>
    store.dispatch(
      applicationApi.endpoints.updatePersonal.initiate(
        { applicationId, values },
        { track: false },
      ),
    ),
  ),
  employment: createApplicationSaver<EmploymentForm>((applicationId, values) =>
    store.dispatch(
      applicationApi.endpoints.updateEmployment.initiate(
        { applicationId, values },
        { track: false },
      ),
    ),
  ),
  education: createApplicationSaver<EducationForm>((applicationId, values) =>
    store.dispatch(
      applicationApi.endpoints.updateEducation.initiate(
        { applicationId, values },
        { track: false },
      ),
    ),
  ),
  references: createApplicationSaver<ReferencesForm>((applicationId, values) =>
    store.dispatch(
      applicationApi.endpoints.updateReferences.initiate(
        { applicationId, values },
        { track: false },
      ),
    ),
  ),
};
