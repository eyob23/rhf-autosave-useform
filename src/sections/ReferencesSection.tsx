import { useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link, useParams } from "react-router-dom";
import { emptyReferencesForm } from "../api/forms";
import { useGetReferencesQuery } from "../api/service";
import {
  applicationAutoSaveStatusLabel,
  applicationAutoSaveStatusKey,
  applicationSavers,
} from "../integrations/applicationAutosave";
import { useAutoSaveForm } from "../rhf-autosave";
import { AutoSaveForm } from "../rhf-autosave/react-router";
import { useIsViewMode } from "../useApplicationMode";
import { referencesSchema } from "../validation/applicationSchemas";

export function ReferencesSection() {
  const { applicationId = "" } = useParams();
  const isViewMode = useIsViewMode();
  const { data, isLoading, isError } = useGetReferencesQuery(applicationId);
  const { form, autosave } = useAutoSaveForm({
    defaultValues: emptyReferencesForm(),
    values: data,
    mode: "onBlur",
    resolver: yupResolver(referencesSchema),
    disabled: isViewMode,
    save: applicationSavers.references(applicationId),
  });
  const saveNow = async () => {
    void form.trigger();
    await autosave.forceSave();
  };
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
      statusKey={applicationAutoSaveStatusKey(applicationId, "references")}
      statusLabel={applicationAutoSaveStatusLabel(applicationId, "references")}
      retainStatusOnUnmount
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
                  Name{" "}
                  <span className="required-marker" aria-hidden="true">
                    *
                  </span>
                  <input {...form.register(`references.${index}.name`)} />
                  <span className="field-error">
                    {form.formState.errors.references?.[index]?.name?.message}
                  </span>
                </label>
                <label>
                  Relationship{" "}
                  <span className="required-marker" aria-hidden="true">
                    *
                  </span>
                  <input
                    {...form.register(`references.${index}.relationship`)}
                  />
                  <span className="field-error">
                    {
                      form.formState.errors.references?.[index]?.relationship
                        ?.message
                    }
                  </span>
                </label>
                <label>
                  Email{" "}
                  <span className="required-marker" aria-hidden="true">
                    *
                  </span>
                  <input
                    type="email"
                    {...form.register(`references.${index}.email`)}
                  />
                  <span className="field-error">
                    {form.formState.errors.references?.[index]?.email?.message}
                  </span>
                </label>
                <label>
                  Phone{" "}
                  <span className="required-marker" aria-hidden="true">
                    *
                  </span>
                  <input
                    type="tel"
                    {...form.register(`references.${index}.phone`)}
                  />
                  <span className="field-error">
                    {form.formState.errors.references?.[index]?.phone?.message}
                  </span>
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
            <span className="required-marker" aria-hidden="true">
              *
            </span>
            <span className="field-error">
              {form.formState.errors.consentToContact?.message}
            </span>
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
          <button type="button" className="button" onClick={saveNow}>
            Save now
          </button>
        </div>
      </section>
    </AutoSaveForm>
  );
}
