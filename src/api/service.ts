import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  mockApi,
  type EducationForm,
  type EmploymentForm,
  type PersonalForm,
  type ReferencesForm,
} from "./mockApi";

type UpdateArgs<T> = { applicationId: string; values: T };

function normalizeApiError(error: unknown) {
  const candidate = error as { message?: unknown; status?: unknown } | null;
  const status =
    typeof candidate?.status === "number" ||
    typeof candidate?.status === "string"
      ? candidate.status
      : "SIMULATED_ERROR";
  const message =
    typeof candidate?.message === "string"
      ? candidate.message
      : "The simulated API request failed.";

  return { status, data: { message } };
}

async function queryData<T>(request: Promise<T>) {
  try {
    return { data: await request };
  } catch (error) {
    return { error: normalizeApiError(error) };
  }
}

export const applicationApi = createApi({
  reducerPath: "applicationApi",
  baseQuery: fakeBaseQuery<unknown>(),
  tagTypes: ["Applications"],
  endpoints: (builder) => ({
    getApplications: builder.query<
      Awaited<ReturnType<typeof mockApi.listApplications>>,
      void
    >({
      queryFn: (_argument, api) =>
        queryData(mockApi.listApplications(api.signal)),
      providesTags: ["Applications"],
    }),
    createApplication: builder.mutation<
      Awaited<ReturnType<typeof mockApi.createApplication>>,
      void
    >({
      queryFn: async () => ({ data: await mockApi.createApplication() }),
      invalidatesTags: ["Applications"],
    }),
    deleteApplication: builder.mutation<void, string>({
      queryFn: async (applicationId) => {
        await mockApi.deleteApplication(applicationId);
        return { data: undefined };
      },
      invalidatesTags: ["Applications"],
    }),
    getPersonal: builder.query<PersonalForm, string>({
      queryFn: (applicationId, api) =>
        queryData(mockApi.getPersonal(applicationId, api.signal)),
    }),
    updatePersonal: builder.mutation<void, UpdateArgs<PersonalForm>>({
      queryFn: async ({ applicationId, values }, api) => {
        try {
          await mockApi.savePersonal(applicationId, values, api.signal);
          return { data: undefined };
        } catch (error) {
          return { error: normalizeApiError(error) };
        }
      },
      onQueryStarted: async (
        { applicationId, values },
        { dispatch, queryFulfilled },
      ) => {
        const savedValues = structuredClone(values);
        try {
          await queryFulfilled;
          dispatch(
            applicationApi.util.updateQueryData(
              "getPersonal",
              applicationId,
              () => savedValues,
            ),
          );
        } catch {
          return;
        }
      },
      invalidatesTags: ["Applications"],
    }),
    getEmployment: builder.query<EmploymentForm, string>({
      queryFn: (applicationId, api) =>
        queryData(mockApi.getEmployment(applicationId, api.signal)),
    }),
    updateEmployment: builder.mutation<void, UpdateArgs<EmploymentForm>>({
      queryFn: async ({ applicationId, values }, api) => {
        try {
          await mockApi.saveEmployment(applicationId, values, api.signal);
          return { data: undefined };
        } catch (error) {
          return { error: normalizeApiError(error) };
        }
      },
      onQueryStarted: async (
        { applicationId, values },
        { dispatch, queryFulfilled },
      ) => {
        const savedValues = structuredClone(values);
        try {
          await queryFulfilled;
          dispatch(
            applicationApi.util.updateQueryData(
              "getEmployment",
              applicationId,
              () => savedValues,
            ),
          );
        } catch {
          return;
        }
      },
      invalidatesTags: ["Applications"],
    }),
    getEducation: builder.query<EducationForm, string>({
      queryFn: (applicationId, api) =>
        queryData(mockApi.getEducation(applicationId, api.signal)),
    }),
    updateEducation: builder.mutation<void, UpdateArgs<EducationForm>>({
      queryFn: async ({ applicationId, values }, api) => {
        try {
          await mockApi.saveEducation(applicationId, values, api.signal);
          return { data: undefined };
        } catch (error) {
          return { error: normalizeApiError(error) };
        }
      },
      onQueryStarted: async (
        { applicationId, values },
        { dispatch, queryFulfilled },
      ) => {
        const savedValues = structuredClone(values);
        try {
          await queryFulfilled;
          dispatch(
            applicationApi.util.updateQueryData(
              "getEducation",
              applicationId,
              () => savedValues,
            ),
          );
        } catch {
          return;
        }
      },
      invalidatesTags: ["Applications"],
    }),
    getReferences: builder.query<ReferencesForm, string>({
      queryFn: (applicationId, api) =>
        queryData(mockApi.getReferences(applicationId, api.signal)),
    }),
    updateReferences: builder.mutation<void, UpdateArgs<ReferencesForm>>({
      queryFn: async ({ applicationId, values }, api) => {
        try {
          await mockApi.saveReferences(applicationId, values, api.signal);
          return { data: undefined };
        } catch (error) {
          return { error: normalizeApiError(error) };
        }
      },
      onQueryStarted: async (
        { applicationId, values },
        { dispatch, queryFulfilled },
      ) => {
        const savedValues = structuredClone(values);
        try {
          await queryFulfilled;
          dispatch(
            applicationApi.util.updateQueryData(
              "getReferences",
              applicationId,
              () => savedValues,
            ),
          );
        } catch {
          return;
        }
      },
      invalidatesTags: ["Applications"],
    }),
  }),
});

export const {
  useGetApplicationsQuery,
  useCreateApplicationMutation,
  useDeleteApplicationMutation,
  useGetPersonalQuery,
  useGetEmploymentQuery,
  useGetEducationQuery,
  useGetReferencesQuery,
} = applicationApi;
