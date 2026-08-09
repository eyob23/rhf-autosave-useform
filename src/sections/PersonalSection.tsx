import { Link, useParams } from "react-router-dom";
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

export function PersonalSection() {
  const { applicationId = "" } = useParams();
  const isViewMode = useIsViewMode();
  const { data, isLoading, isError } = useGetPersonalQuery(applicationId);
  const { form, autosave } = useAutoSaveForm({
    defaultValues: emptyPersonalForm(),
    values: data,
    mode: "onBlur",
    disabled: isViewMode,
    save: applicationSavers.personal(applicationId),
  });

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
            First name
            <input {...form.register("firstName")} />
          </label>
          <label>
            Last name
            <input {...form.register("lastName")} />
          </label>
          <label>
            Preferred name
            <input {...form.register("preferredName")} />
          </label>
          <label>
            Date of birth
            <input type="date" {...form.register("dateOfBirth")} />
          </label>
          <label>
            Email
            <input type="email" {...form.register("email")} />
          </label>
          <label>
            Phone
            <input type="tel" {...form.register("phone")} />
          </label>
          <fieldset className="full subform">
            <legend>Residential address</legend>
            <div className="form-grid compact">
              <label className="full">
                Address line 1<input {...form.register("address.line1")} />
              </label>
              <label className="full">
                Address line 2<input {...form.register("address.line2")} />
              </label>
              <label>
                City
                <input {...form.register("address.city")} />
              </label>
              <label>
                State / region
                <input {...form.register("address.region")} />
              </label>
              <label>
                Postal code
                <input {...form.register("address.postalCode")} />
              </label>
              <label>
                Country
                <input {...form.register("address.country")} />
              </label>
            </div>
          </fieldset>
          <label className="full">
            Preferred contact method
            <select {...form.register("contactPreference")}>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
          </label>
        </div>
        <div className="actions">
          <span />
          <Link className="button" to="../employment">
            Next: Employment
          </Link>
        </div>
      </section>
    </AutoSaveForm>
  );
}
