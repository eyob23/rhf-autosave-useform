import {
  emptyEducationForm,
  emptyEmploymentForm,
  emptyPersonalForm,
  emptyReferencesForm,
  type EducationForm,
  type EmploymentForm,
  type PersonalForm,
  type ReferencesForm,
} from "./forms";
import { runSimulatedRequest } from "./simulation";

export type {
  EducationForm,
  EmploymentForm,
  PersonalForm,
  ReferencesForm,
} from "./forms";

type ApplicationRecord = {
  id: string;
  title: string;
  status: ApplicationStatus;
  updatedAt: string;
  personal: PersonalForm;
  employment: EmploymentForm;
  education: EducationForm;
  references: ReferencesForm;
};

export type ApplicationStatus = "Draft" | "In review" | "Complete";

export type ApplicationSummary = {
  id: string;
  title: string;
  applicantName: string;
  email: string;
  status: ApplicationStatus;
  updatedAt: string;
};

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = window.setTimeout(resolve, ms);
    const onAbort = () => {
      window.clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

const createApplication = (
  applicationId: string,
  firstName = applicationId === "application-002" ? "Grace" : "Ada",
  lastName = applicationId === "application-002" ? "Hopper" : "Lovelace",
  title = `${firstName} ${lastName} application`,
  status: ApplicationStatus = "Draft",
  updatedAt = new Date().toISOString(),
): ApplicationRecord => {
  const personal = emptyPersonalForm();
  personal.firstName = firstName;
  personal.lastName = lastName;
  if (firstName) {
    personal.email = `${personal.firstName.toLowerCase()}@example.com`;
    personal.phone = "+1 555 0100";
    personal.address.city =
      applicationId === "application-002" ? "New York" : "London";
    personal.address.country =
      applicationId === "application-002" ? "United States" : "United Kingdom";
  }

  const employment = emptyEmploymentForm();
  if (firstName) {
    employment.history[0] = {
      employer:
        applicationId === "application-002"
          ? "US Navy"
          : "Analytical Engines Inc.",
      title:
        applicationId === "application-002" ? "Rear Admiral" : "Mathematician",
      startDate: "2020-01-01",
      endDate: "",
      current: true,
      responsibilities:
        "Leading complex technical programs and cross-functional teams.",
    };
  }

  return {
    id: applicationId,
    title,
    status,
    updatedAt,
    personal,
    employment,
    education: emptyEducationForm(),
    references: emptyReferencesForm(),
  };
};

const db = new Map<string, ApplicationRecord>();

const seededApplications: Array<
  [string, string, string, string, ApplicationStatus, string]
> = [
  [
    "application-001",
    "Ada",
    "Lovelace",
    "Senior Platform Engineer",
    "In review",
    "2026-08-09T09:42:00Z",
  ],
  [
    "application-002",
    "Grace",
    "Hopper",
    "Engineering Director",
    "Complete",
    "2026-08-08T16:18:00Z",
  ],
  [
    "application-003",
    "Katherine",
    "Johnson",
    "Data Science Lead",
    "Draft",
    "2026-08-08T11:05:00Z",
  ],
  [
    "application-004",
    "Alan",
    "Turing",
    "Security Researcher",
    "In review",
    "2026-08-07T14:33:00Z",
  ],
  [
    "application-005",
    "Margaret",
    "Hamilton",
    "Principal Software Architect",
    "Complete",
    "2026-08-06T10:20:00Z",
  ],
  [
    "application-006",
    "Donald",
    "Knuth",
    "Research Fellow",
    "Draft",
    "2026-08-05T17:54:00Z",
  ],
  [
    "application-007",
    "Radia",
    "Perlman",
    "Network Systems Engineer",
    "In review",
    "2026-08-05T08:16:00Z",
  ],
  [
    "application-008",
    "Barbara",
    "Liskov",
    "Distinguished Engineer",
    "Complete",
    "2026-08-04T15:48:00Z",
  ],
  [
    "application-009",
    "Edsger",
    "Dijkstra",
    "Algorithms Specialist",
    "Draft",
    "2026-08-03T13:27:00Z",
  ],
  [
    "application-010",
    "Mary",
    "Jackson",
    "Aerospace Engineer",
    "In review",
    "2026-08-02T09:12:00Z",
  ],
  [
    "application-011",
    "Tim",
    "Berners-Lee",
    "Web Standards Lead",
    "Complete",
    "2026-08-01T18:41:00Z",
  ],
  [
    "application-012",
    "Frances",
    "Allen",
    "Compiler Engineer",
    "Draft",
    "2026-07-31T12:08:00Z",
  ],
  [
    "application-013",
    "James",
    "Gosling",
    "Runtime Architect",
    "In review",
    "2026-07-30T16:22:00Z",
  ],
  [
    "application-014",
    "Annie",
    "Easley",
    "Research Scientist",
    "Complete",
    "2026-07-29T10:37:00Z",
  ],
  [
    "application-015",
    "Guido",
    "van Rossum",
    "Developer Experience Lead",
    "Draft",
    "2026-07-28T14:59:00Z",
  ],
  [
    "application-016",
    "Jean",
    "Bartik",
    "Systems Programmer",
    "In review",
    "2026-07-27T11:44:00Z",
  ],
];

seededApplications.forEach(
  ([id, firstName, lastName, title, status, updatedAt]) => {
    db.set(
      id,
      createApplication(id, firstName, lastName, title, status, updatedAt),
    );
  },
);

const getApplication = (applicationId: string) => {
  if (!db.has(applicationId))
    db.set(applicationId, createApplication(applicationId));
  return db.get(applicationId)!;
};

const getSection = async <K extends keyof ApplicationRecord>(
  applicationId: string,
  section: K,
  signal?: AbortSignal,
) =>
  runSimulatedRequest(
    "read",
    signal,
    () => structuredClone(getApplication(applicationId)[section]),
    250,
  );

const saveSection = async <K extends keyof ApplicationRecord>(
  applicationId: string,
  section: K,
  data: ApplicationRecord[K],
  signal: AbortSignal,
) =>
  runSimulatedRequest(
    "save",
    signal,
    () => {
      const application = getApplication(applicationId);
      application[section] = structuredClone(data);
      application.updatedAt = new Date().toISOString();
    },
    650,
  );

const toSummary = (application: ApplicationRecord): ApplicationSummary => ({
  id: application.id,
  title: application.title,
  applicantName:
    `${application.personal.firstName} ${application.personal.lastName}`.trim() ||
    "Untitled applicant",
  email: application.personal.email,
  status: application.status,
  updatedAt: application.updatedAt,
});

export const mockApi = {
  listApplications: (signal?: AbortSignal) =>
    runSimulatedRequest(
      "read",
      signal,
      () =>
        Array.from(db.values(), toSummary).sort((first, second) =>
          second.updatedAt.localeCompare(first.updatedAt),
        ),
      250,
    ),
  createApplication: async () => {
    await sleep(250);
    const applicationId = `application-${crypto.randomUUID().slice(0, 8)}`;
    const application = createApplication(
      applicationId,
      "",
      "",
      "New application",
    );
    db.set(applicationId, application);
    return toSummary(application);
  },
  deleteApplication: async (applicationId: string) => {
    await sleep(250);
    db.delete(applicationId);
  },
  getPersonal: (applicationId: string, signal?: AbortSignal) =>
    getSection(applicationId, "personal", signal),
  savePersonal: (
    applicationId: string,
    data: PersonalForm,
    signal: AbortSignal,
  ) => saveSection(applicationId, "personal", data, signal),
  getEmployment: (applicationId: string, signal?: AbortSignal) =>
    getSection(applicationId, "employment", signal),
  saveEmployment: (
    applicationId: string,
    data: EmploymentForm,
    signal: AbortSignal,
  ) => saveSection(applicationId, "employment", data, signal),
  getEducation: (applicationId: string, signal?: AbortSignal) =>
    getSection(applicationId, "education", signal),
  saveEducation: (
    applicationId: string,
    data: EducationForm,
    signal: AbortSignal,
  ) => saveSection(applicationId, "education", data, signal),
  getReferences: (applicationId: string, signal?: AbortSignal) =>
    getSection(applicationId, "references", signal),
  saveReferences: (
    applicationId: string,
    data: ReferencesForm,
    signal: AbortSignal,
  ) => saveSection(applicationId, "references", data, signal),
};
