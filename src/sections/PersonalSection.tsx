import { Link, useParams } from "react-router-dom";
import { yupResolver } from "@hookform/resolvers/yup";
import { emptyPersonalForm } from "../api/forms";
import { useGetPersonalQuery } from "../api/service";
import {
  applicationAutoSaveStatusLabel,
  applicationAutoSaveStatusKey,
  applicationSavers,
} from "../integrations/applicationAutosave";
import { useAutoSaveForm } from "../rhf-autosave";
import { AutoSaveForm } from "../rhf-autosave/react-router";
import { useIsViewMode } from "../useApplicationMode";
import { personalSchema } from "../validation/applicationSchemas";

export function PersonalSection() {
  const { applicationId = "" } = useParams();
  const isViewMode = useIsViewMode();
  const { data, isLoading, isError } = useGetPersonalQuery(applicationId);
  const { form, autosave } = useAutoSaveForm({
    defaultValues: emptyPersonalForm(),
    values: data,
    mode: "onBlur",
    resolver: yupResolver(personalSchema),
    disabled: isViewMode,
    save: applicationSavers.personal(applicationId),
  });
  const saveNow = async () => {
    void form.trigger();
    await autosave.forceSave();
  };

  if (isLoading)
    return (
      <section className="card">
        <p>Loading personal section...</p>
      </section>
    );
  if (isError)
    return (
      <section className="card">
        <p>Unable to load personal section.</p>
      </section>
    );

  return (
    <AutoSaveForm
      form={form}
      controller={autosave}
      statusKey={applicationAutoSaveStatusKey(applicationId, "personal")}
      statusLabel={applicationAutoSaveStatusLabel(applicationId, "personal")}
      retainStatusOnUnmount
    >
      <section className="card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Section 1 of 4</span>
            <h2>Personal information</h2>
            <p>Identity, contact details, and primary residence.</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            First name{" "}
            <span className="required-marker" aria-hidden="true">
              *
            </span>
            <input {...form.register("firstName")} />
            <span className="field-error">
              {form.formState.errors.firstName?.message}
            </span>
          </label>
          <label>
            Last name{" "}
            <span className="required-marker" aria-hidden="true">
              *
            </span>
            <input {...form.register("lastName")} />
            <span className="field-error">
              {form.formState.errors.lastName?.message}
            </span>
          </label>
          <label>
            Preferred name
            <input {...form.register("preferredName")} />
          </label>
          <label>
            Date of birth{" "}
            <span className="required-marker" aria-hidden="true">
              *
            </span>
            <input type="date" {...form.register("dateOfBirth")} />
            <span className="field-error">
              {form.formState.errors.dateOfBirth?.message}
            </span>
          </label>
          <label>
            Email{" "}
            <span className="required-marker" aria-hidden="true">
              *
            </span>
            <input type="email" {...form.register("email")} />
            <span className="field-error">
              {form.formState.errors.email?.message}
            </span>
          </label>
          <label>
            Phone{" "}
            <span className="required-marker" aria-hidden="true">
              *
            </span>
            <input type="tel" {...form.register("phone")} />
            <span className="field-error">
              {form.formState.errors.phone?.message}
            </span>
          </label>
          <fieldset className="full subform">
            <legend>Residential address</legend>
            <div className="form-grid compact">
              <label className="full">
                Address line 1{" "}
                <span className="required-marker" aria-hidden="true">
                  *
                </span>
                <input {...form.register("address.line1")} />
                <span className="field-error">
                  {form.formState.errors.address?.line1?.message}
                </span>
              </label>
              <label className="full">
                Address line 2<input {...form.register("address.line2")} />
              </label>
              <label>
                City{" "}
                <span className="required-marker" aria-hidden="true">
                  *
                </span>
                <input {...form.register("address.city")} />
                <span className="field-error">
                  {form.formState.errors.address?.city?.message}
                </span>
              </label>
              <label>
                State / region{" "}
                <span className="required-marker" aria-hidden="true">
                  *
                </span>
                <input {...form.register("address.region")} />
                <span className="field-error">
                  {form.formState.errors.address?.region?.message}
                </span>
              </label>
              <label>
                Postal code{" "}
                <span className="required-marker" aria-hidden="true">
                  *
                </span>
                <input {...form.register("address.postalCode")} />
                <span className="field-error">
                  {form.formState.errors.address?.postalCode?.message}
                </span>
              </label>
              <label>
                Country{" "}
                <span className="required-marker" aria-hidden="true">
                  *
                </span>
                <input {...form.register("address.country")} />
                <span className="field-error">
                  {form.formState.errors.address?.country?.message}
                </span>
              </label>
            </div>
          </fieldset>
          <label className="full">
            Preferred contact method{" "}
            <span className="required-marker" aria-hidden="true">
              *
            </span>
            <select {...form.register("contactPreference")}>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
            <span className="field-error">
              {form.formState.errors.contactPreference?.message}
            </span>
          </label>
        </div>
        <div className="actions">
          <span />
          <button type="button" className="button secondary" onClick={saveNow}>
            Save now
          </button>
          <Link className="button" to="../employment">
            Next: Employment
          </Link>
        </div>
      </section>
    </AutoSaveForm>
  );
}
