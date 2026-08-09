import { useFieldArray } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { emptyReferencesForm } from "../api/forms";
import { useGetReferencesQuery } from "../api/service";
import {
  applicationAutoSaveStatusKey,
  applicationSavers,
} from "../integrations/applicationAutosave";
import { useAutoSaveForm } from "../rhf-autosave";
import { AutoSaveForm } from "../rhf-autosave/react-router";
import { useIsViewMode } from "../useApplicationMode";

export function ReferencesSection() {
  const { applicationId = "" } = useParams();
  const isViewMode = useIsViewMode();
  const { data, isLoading, isError } = useGetReferencesQuery(applicationId);
  const { form, autosave } = useAutoSaveForm({
    defaultValues: emptyReferencesForm(),
    values: data,
    mode: "onBlur",
    disabled: isViewMode,
    save: applicationSavers.references(applicationId),
  });
  const references = useFieldArray({
    control: form.control,
    name: "references",
  });

  if (isLoading)
    return (
      <section className="card">
        <p>Loading references section...</p>
      </section>
    );
  if (isError)
    return (
      <section className="card">
        <p>Unable to load references section.</p>
      </section>
    );

  return (
    <AutoSaveForm
      form={form}
      controller={autosave}
      statusKey={applicationAutoSaveStatusKey}
    >
      <section className="card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Section 4 of 4</span>
            <h2>Professional references</h2>
            <p>People who can speak to your experience and working style.</p>
          </div>
        </div>
        <div className="array-list">
          {references.fields.map((field, index) => (
            <fieldset className="subform" key={field.id}>
              <legend>Reference {index + 1}</legend>
              <div className="form-grid compact">
                <label>
                  Name
                  <input {...form.register(`references.${index}.name`)} />
                </label>
                <label>
                  Relationship
                  <input
                    {...form.register(`references.${index}.relationship`)}
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    {...form.register(`references.${index}.email`)}
                  />
                </label>
                <label>
                  Phone
                  <input
                    type="tel"
                    {...form.register(`references.${index}.phone`)}
                  />
                </label>
              </div>
              {references.fields.length > 1 && (
                <button
                  type="button"
                  className="text-button danger"
                  onClick={() => references.remove(index)}
                >
                  Remove reference
                </button>
              )}
            </fieldset>
          ))}
        </div>
        <button
          type="button"
          className="button secondary add-button"
          onClick={() =>
            references.append({
              name: "",
              relationship: "",
              email: "",
              phone: "",
            })
          }
        >
          + Add reference
        </button>
        <div className="form-grid">
          <label className="checkbox full">
            <input type="checkbox" {...form.register("consentToContact")} /> I
            consent to these references being contacted
          </label>
          <label className="full">
            Additional notes
            <textarea rows={4} {...form.register("additionalNotes")} />
          </label>
        </div>
        <div className="actions">
          <Link className="button secondary" to="../education">
            Education
          </Link>
          <button
            type="button"
            className="button"
            onClick={() => void autosave.flush().catch(() => undefined)}
          >
            Save now
          </button>
        </div>
      </section>
    </AutoSaveForm>
  );
}
