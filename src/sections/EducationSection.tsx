import { useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link, useParams } from "react-router-dom";
import { emptyEducationForm, emptyEducationItem } from "../api/forms";
import { useGetEducationQuery } from "../api/service";
import {
  applicationAutoSaveStatusLabel,
  applicationAutoSaveStatusKey,
  applicationSavers,
} from "../integrations/applicationAutosave";
import { useAutoSaveForm } from "../rhf-autosave";
import { AutoSaveForm } from "../rhf-autosave/react-router";
import { useIsViewMode } from "../useApplicationMode";
import { educationSchema } from "../validation/applicationSchemas";

export function EducationSection() {
  const { applicationId = "" } = useParams();
  const isViewMode = useIsViewMode();
  const { data, isLoading, isError } = useGetEducationQuery(applicationId);
  const { form, autosave } = useAutoSaveForm({
    defaultValues: emptyEducationForm(),
    values: data,
    mode: "onBlur",
    resolver: yupResolver(educationSchema),
    disabled: isViewMode,
    save: applicationSavers.education(applicationId),
  });
  const saveNow = async () => {
    void form.trigger();
    await autosave.forceSave();
  };
  const education = useFieldArray({ control: form.control, name: "education" });
  const certifications = useFieldArray({
    control: form.control,
    name: "certifications",
  });

  if (isLoading)
    return (
      <section className="card">
        <p>Loading education section...</p>
      </section>
    );
  if (isError)
    return (
      <section className="card">
        <p>Unable to load education section.</p>
      </section>
    );

  return (
    <AutoSaveForm
      form={form}
      controller={autosave}
      statusKey={applicationAutoSaveStatusKey(applicationId, "education")}
      statusLabel={applicationAutoSaveStatusLabel(applicationId, "education")}
      retainStatusOnUnmount
    >
      <section className="card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Section 3 of 4</span>
            <h2>Education and credentials</h2>
            <p>Formal education and active professional certifications.</p>
          </div>
        </div>
        <div className="form-grid">
          <label className="full">
            Highest education level{" "}
            <span className="required-marker" aria-hidden="true">
              *
            </span>
            <select {...form.register("highestLevel")}>
              <option value="">Select a level</option>
              <option>High school</option>
              <option>Associate degree</option>
              <option>Bachelor's degree</option>
              <option>Master's degree</option>
              <option>Doctorate</option>
            </select>
            <span className="field-error">
              {form.formState.errors.highestLevel?.message}
            </span>
          </label>
        </div>
        <div className="array-list">
          {education.fields.map((field, index) => (
            <fieldset className="subform" key={field.id}>
              <legend>Education {index + 1}</legend>
              <div className="form-grid compact">
                <label>
                  Institution{" "}
                  <span className="required-marker" aria-hidden="true">
                    *
                  </span>
                  <input {...form.register(`education.${index}.institution`)} />
                  <span className="field-error">
                    {
                      form.formState.errors.education?.[index]?.institution
                        ?.message
                    }
                  </span>
                </label>
                <label>
                  Qualification{" "}
                  <span className="required-marker" aria-hidden="true">
                    *
                  </span>
                  <input
                    {...form.register(`education.${index}.qualification`)}
                  />
                  <span className="field-error">
                    {
                      form.formState.errors.education?.[index]?.qualification
                        ?.message
                    }
                  </span>
                </label>
                <label>
                  Field of study{" "}
                  <span className="required-marker" aria-hidden="true">
                    *
                  </span>
                  <input
                    {...form.register(`education.${index}.fieldOfStudy`)}
                  />
                  <span className="field-error">
                    {
                      form.formState.errors.education?.[index]?.fieldOfStudy
                        ?.message
                    }
                  </span>
                </label>
                <label>
                  Graduation year{" "}
                  <span className="required-marker" aria-hidden="true">
                    *
                  </span>
                  <input
                    type="number"
                    {...form.register(`education.${index}.graduationYear`, {
                      setValueAs: (value) =>
                        value === "" ? null : Number(value),
                    })}
                  />
                  <span className="field-error">
                    {
                      form.formState.errors.education?.[index]?.graduationYear
                        ?.message
                    }
                  </span>
                </label>
              </div>
              {education.fields.length > 1 && (
                <button
                  type="button"
                  className="text-button danger"
                  onClick={() => education.remove(index)}
                >
                  Remove education
                </button>
              )}
            </fieldset>
          ))}
        </div>
        <button
          type="button"
          className="button secondary add-button"
          onClick={() => education.append(emptyEducationItem())}
        >
          + Add education
        </button>
        <h3>Certifications</h3>
        <div className="array-list">
          {certifications.fields.map((field, index) => (
            <fieldset className="subform" key={field.id}>
              <legend>Certification {index + 1}</legend>
              <div className="form-grid compact">
                <label>
                  Name{" "}
                  <span className="required-marker" aria-hidden="true">
                    *
                  </span>
                  <input {...form.register(`certifications.${index}.name`)} />
                  <span className="field-error">
                    {
                      form.formState.errors.certifications?.[index]?.name
                        ?.message
                    }
                  </span>
                </label>
                <label>
                  Issuer{" "}
                  <span className="required-marker" aria-hidden="true">
                    *
                  </span>
                  <input {...form.register(`certifications.${index}.issuer`)} />
                  <span className="field-error">
                    {
                      form.formState.errors.certifications?.[index]?.issuer
                        ?.message
                    }
                  </span>
                </label>
                <label>
                  Expiration date{" "}
                  <span className="required-marker" aria-hidden="true">
                    *
                  </span>
                  <input
                    type="date"
                    {...form.register(`certifications.${index}.expiresOn`)}
                  />
                  <span className="field-error">
                    {
                      form.formState.errors.certifications?.[index]?.expiresOn
                        ?.message
                    }
                  </span>
                </label>
              </div>
              <button
                type="button"
                className="text-button danger"
                onClick={() => certifications.remove(index)}
              >
                Remove certification
              </button>
            </fieldset>
          ))}
        </div>
        <button
          type="button"
          className="button secondary add-button"
          onClick={() =>
            certifications.append({ name: "", issuer: "", expiresOn: "" })
          }
        >
          + Add certification
        </button>
        <div className="actions">
          <Link className="button secondary" to="../employment">
            Employment
          </Link>
          <button type="button" className="button secondary" onClick={saveNow}>
            Save now
          </button>
          <Link className="button" to="../references">
            Next: References
          </Link>
        </div>
      </section>
    </AutoSaveForm>
  );
}
