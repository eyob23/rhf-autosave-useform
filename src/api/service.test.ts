// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { store } from "../store";
import { applicationApi } from "./service";

describe("applicationApi section cache", () => {
  afterEach(() => {
    store.dispatch(applicationApi.util.resetApiState());
  });

  it("stores successfully saved personal values for subsequent routes", async () => {
    const applicationId = "cache-regression-application";
    const query = store.dispatch(
      applicationApi.endpoints.getPersonal.initiate(applicationId),
    );
    const original = await query.unwrap();
    const updated = {
      ...original,
      firstName: "Current",
      lastName: "Applicant",
      email: "current@example.com",
    };

    const response = await store
      .dispatch(
        applicationApi.endpoints.updatePersonal.initiate(
          { applicationId, values: updated },
          { track: false },
        ),
      )
      .unwrap();
    expect(response).toBeUndefined();

    const cached = applicationApi.endpoints.getPersonal.select(applicationId)(
      store.getState(),
    ).data;
    expect(cached).toEqual(updated);
    query.unsubscribe();
  });

  it("stores successfully saved employment values", async () => {
    const applicationId = "cache-employment-application";
    const query = store.dispatch(
      applicationApi.endpoints.getEmployment.initiate(applicationId),
    );
    const original = await query.unwrap();
    const updated = { ...original, employmentStatus: "student" as const };

    await store
      .dispatch(
        applicationApi.endpoints.updateEmployment.initiate(
          { applicationId, values: updated },
          { track: false },
        ),
      )
      .unwrap();

    const cached = applicationApi.endpoints.getEmployment.select(applicationId)(
      store.getState(),
    ).data;
    expect(cached).toEqual(updated);
    query.unsubscribe();
  });

  it("stores successfully saved education values", async () => {
    const applicationId = "cache-education-application";
    const query = store.dispatch(
      applicationApi.endpoints.getEducation.initiate(applicationId),
    );
    const original = await query.unwrap();
    const updated = { ...original, highestLevel: "Doctorate" };

    await store
      .dispatch(
        applicationApi.endpoints.updateEducation.initiate(
          { applicationId, values: updated },
          { track: false },
        ),
      )
      .unwrap();

    const cached = applicationApi.endpoints.getEducation.select(applicationId)(
      store.getState(),
    ).data;
    expect(cached).toEqual(updated);
    query.unsubscribe();
  });

  it("stores successfully saved reference values", async () => {
    const applicationId = "cache-references-application";
    const query = store.dispatch(
      applicationApi.endpoints.getReferences.initiate(applicationId),
    );
    const original = await query.unwrap();
    const updated = { ...original, additionalNotes: "Call after 3 PM" };

    await store
      .dispatch(
        applicationApi.endpoints.updateReferences.initiate(
          { applicationId, values: updated },
          { track: false },
        ),
      )
      .unwrap();

    const cached = applicationApi.endpoints.getReferences.select(applicationId)(
      store.getState(),
    ).data;
    expect(cached).toEqual(updated);
    query.unsubscribe();
  });

  it("does not overwrite cached values when a save is aborted", async () => {
    const applicationId = "cache-aborted-application";
    const query = store.dispatch(
      applicationApi.endpoints.getPersonal.initiate(applicationId),
    );
    const original = await query.unwrap();
    const request = store.dispatch(
      applicationApi.endpoints.updatePersonal.initiate(
        {
          applicationId,
          values: { ...original, firstName: "Should not persist" },
        },
        { track: false },
      ),
    );

    request.abort();
    await expect(request.unwrap()).rejects.toBeTruthy();

    const cached = applicationApi.endpoints.getPersonal.select(applicationId)(
      store.getState(),
    ).data;
    expect(cached).toEqual(original);
    query.unsubscribe();
  });
});
