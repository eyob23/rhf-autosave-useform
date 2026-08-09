import { useFieldArray } from "react-hook-form";
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

export function EducationSection() {
  const { applicationId = "" } = useParams();
  const isViewMode = useIsViewMode();
  const { data, isLoading, isError } = useGetEducationQuery(applicationId);
  const { form, autosave } = useAutoSaveForm({
    defaultValues: emptyEducationForm(),
    values: data,
    mode: "onBlur",
    disabled: isViewMode,
    save: applicationSavers.education(applicationId),
  });
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
            Highest education level
            <select {...form.register("highestLevel")}>
              <option value="">Select a level</option>
              <option>High school</option>
              <option>Associate degree</option>
              <option>Bachelor's degree</option>
              <option>Master's degree</option>
              <option>Doctorate</option>
            </select>
          </label>
        </div>
        <div className="array-list">
          {education.fields.map((field, index) => (
            <fieldset className="subform" key={field.id}>
              <legend>Education {index + 1}</legend>
              <div className="form-grid compact">
                <label>
                  Institution
                  <input {...form.register(`education.${index}.institution`)} />
                </label>
                <label>
                  Qualification
                  <input
                    {...form.register(`education.${index}.qualification`)}
                  />
                </label>
                <label>
                  Field of study
                  <input
                    {...form.register(`education.${index}.fieldOfStudy`)}
                  />
                </label>
                <label>
                  Graduation year
                  <input
                    type="number"
                    {...form.register(`education.${index}.graduationYear`, {
                      setValueAs: (value) =>
                        value === "" ? null : Number(value),
                    })}
                  />
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
                  Name
                  <input {...form.register(`certifications.${index}.name`)} />
                </label>
                <label>
                  Issuer
                  <input {...form.register(`certifications.${index}.issuer`)} />
                </label>
                <label>
                  Expiration date
                  <input
                    type="date"
                    {...form.register(`certifications.${index}.expiresOn`)}
                  />
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
          <Link className="button" to="../references">
            Next: References
          </Link>
        </div>
      </section>
    </AutoSaveForm>
  );
}
