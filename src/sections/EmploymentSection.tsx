import { useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link, useParams } from "react-router-dom";
import { emptyEmploymentForm, emptyEmploymentItem } from "../api/forms";
import { useGetEmploymentQuery } from "../api/service";
import {
  applicationAutoSaveStatusLabel,
  applicationAutoSaveStatusKey,
  applicationSavers,
} from "../integrations/applicationAutosave";
import { useAutoSaveForm } from "../rhf-autosave";
import { AutoSaveForm } from "../rhf-autosave/react-router";
import { useIsViewMode } from "../useApplicationMode";
import { employmentSchema } from "../validation/applicationSchemas";

export function EmploymentSection() {
  const { applicationId = "" } = useParams();
  const isViewMode = useIsViewMode();
  const { data, isLoading, isError } = useGetEmploymentQuery(applicationId);
  const { form, autosave } = useAutoSaveForm({
    defaultValues: emptyEmploymentForm(),
    values: data,
    mode: "onBlur",
    resolver: yupResolver(employmentSchema),
    disabled: isViewMode,
    save: applicationSavers.employment(applicationId),
  });
  const history = useFieldArray({ control: form.control, name: "history" });

  if (isLoading)
    return (
      <section className="card">
        <p>Loading employment section...</p>
      </section>
    );
  if (isError)
    return (
      <section className="card">
        <p>Unable to load employment section.</p>
      </section>
    );

  return (
    <AutoSaveForm
      form={form}
      controller={autosave}
      statusKey={applicationAutoSaveStatusKey(applicationId, "employment")}
      statusLabel={applicationAutoSaveStatusLabel(applicationId, "employment")}
      retainStatusOnUnmount
    >
      <section className="card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Section 2 of 4</span>
            <h2>Employment history</h2>
            <p>Add each relevant role, starting with the most recent.</p>
          </div>
        </div>
        <div className="form-grid">
          <label className="full">
            Current status{" "}
            <span className="required-marker" aria-hidden="true">
              *
            </span>
            <select {...form.register("employmentStatus")}>
              <option value="employed">Employed</option>
              <option value="self-employed">Self-employed</option>
              <option value="unemployed">Unemployed</option>
              <option value="student">Student</option>
            </select>
            <span className="field-error">
              {form.formState.errors.employmentStatus?.message}
            </span>
          </label>
        </div>
        <div className="array-list">
          {history.fields.map((field, index) => (
            <fieldset className="subform" key={field.id}>
              <legend>Role {index + 1}</legend>
              <div className="form-grid compact">
                <label>
                  Employer{" "}
                  <span className="required-marker" aria-hidden="true">
                    *
                  </span>
                  <input {...form.register(`history.${index}.employer`)} />
                  <span className="field-error">
                    {form.formState.errors.history?.[index]?.employer?.message}
                  </span>
                </label>
                <label>
                  Job title{" "}
                  <span className="required-marker" aria-hidden="true">
                    *
                  </span>
                  <input {...form.register(`history.${index}.title`)} />
                  <span className="field-error">
                    {form.formState.errors.history?.[index]?.title?.message}
                  </span>
                </label>
                <label>
                  Start date{" "}
                  <span className="required-marker" aria-hidden="true">
                    *
                  </span>
                  <input
                    type="date"
                    {...form.register(`history.${index}.startDate`)}
                  />
                  <span className="field-error">
                    {form.formState.errors.history?.[index]?.startDate?.message}
                  </span>
                </label>
                <label>
                  End date{" "}
                  <span className="required-marker" aria-hidden="true">
                    *
                  </span>
                  <input
                    type="date"
                    disabled={form.watch(`history.${index}.current`)}
                    {...form.register(`history.${index}.endDate`)}
                  />
                  <span className="field-error">
                    {form.formState.errors.history?.[index]?.endDate?.message}
                  </span>
                </label>
                <label className="checkbox full">
                  <input
                    type="checkbox"
                    {...form.register(`history.${index}.current`)}
                  />{" "}
                  I currently work here
                </label>
                <label className="full">
                  Key responsibilities{" "}
                  <span className="required-marker" aria-hidden="true">
                    *
                  </span>
                  <textarea
                    rows={3}
                    {...form.register(`history.${index}.responsibilities`)}
                  />
                  <span className="field-error">
                    {
                      form.formState.errors.history?.[index]?.responsibilities
                        ?.message
                    }
                  </span>
                </label>
              </div>
              {history.fields.length > 1 && (
                <button
                  type="button"
                  className="text-button danger"
                  onClick={() => history.remove(index)}
                >
                  Remove role
                </button>
              )}
            </fieldset>
          ))}
        </div>
        <button
          type="button"
          className="button secondary add-button"
          onClick={() => history.append(emptyEmploymentItem())}
        >
          + Add another role
        </button>
        <div className="actions">
          <Link className="button secondary" to="../personal">
            Personal
          </Link>
          <Link className="button" to="../education">
            Next: Education
          </Link>
        </div>
      </section>
    </AutoSaveForm>
  );
}
