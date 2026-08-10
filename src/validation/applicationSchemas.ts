import * as yup from "yup";
import type {
  EducationForm,
  EducationItem,
  EmploymentForm,
  EmploymentItem,
  PersonalForm,
  ReferencesForm,
} from "../api/forms";

const requiredText = (label: string) =>
  yup.string().trim().required(`${label} is required`);

const optionalText = () => yup.string().trim().default("");

const dateValue = (label: string) =>
  yup
    .string()
    .trim()
    .required(`${label} is required`)
    .matches(/^\d{4}-\d{2}-\d{2}$/, `${label} must be a valid date`);

export const personalSchema: yup.ObjectSchema<PersonalForm> = yup
  .object({
    firstName: requiredText("First name"),
    lastName: requiredText("Last name"),
    preferredName: optionalText(),
    dateOfBirth: dateValue("Date of birth"),
    email: yup
      .string()
      .trim()
      .required("Email is required")
      .email("Enter a valid email address"),
    phone: requiredText("Phone"),
    address: yup
      .object({
        line1: requiredText("Address line 1"),
        line2: optionalText(),
        city: requiredText("City"),
        region: requiredText("State / region"),
        postalCode: requiredText("Postal code"),
        country: requiredText("Country"),
      })
      .required(),
    contactPreference: yup
      .mixed<"email" | "phone">()
      .oneOf(["email", "phone"], "Select a contact preference")
      .required("Preferred contact method is required"),
  })
  .required();

const employmentItemSchema: yup.ObjectSchema<EmploymentItem> = yup
  .object({
    employer: requiredText("Employer"),
    title: requiredText("Job title"),
    startDate: dateValue("Start date"),
    endDate: yup
      .string()
      .trim()
      .default("")
      .defined()
      .test(
        "end-date-when-not-current",
        "End date is required",
        function validateEndDate(value) {
          if (this.parent.current) return true;
          return Boolean(value);
        },
      )
      .test(
        "end-date-format",
        "End date must be a valid date",
        function validateDateFormat(value) {
          if (this.parent.current || value === "") return true;
          return /^\d{4}-\d{2}-\d{2}$/.test(value);
        },
      ),
    current: yup.boolean().required(),
    responsibilities: requiredText("Key responsibilities"),
  })
  .required();

export const employmentSchema: yup.ObjectSchema<EmploymentForm> = yup
  .object({
    employmentStatus: yup
      .mixed<"employed" | "self-employed" | "unemployed" | "student">()
      .oneOf(
        ["employed", "self-employed", "unemployed", "student"],
        "Select a valid status",
      )
      .required("Current status is required"),
    history: yup
      .array()
      .of(employmentItemSchema)
      .min(1, "Add at least one employment entry")
      .required(),
  })
  .required();

const educationItemSchema: yup.ObjectSchema<EducationItem> = yup
  .object({
    institution: requiredText("Institution"),
    qualification: requiredText("Qualification"),
    fieldOfStudy: requiredText("Field of study"),
    graduationYear: yup
      .number()
      .nullable()
      .defined()
      .typeError("Graduation year must be a number")
      .min(1900, "Graduation year is too early")
      .max(2100, "Graduation year is too late")
      .test(
        "graduation-year-required",
        "Graduation year is required",
        (value) => value !== null,
      ),
  })
  .required();

export const educationSchema: yup.ObjectSchema<EducationForm> = yup
  .object({
    highestLevel: requiredText("Highest education level"),
    education: yup.array().of(educationItemSchema).min(1).required(),
    certifications: yup
      .array()
      .of(
        yup
          .object({
            name: requiredText("Certification name"),
            issuer: requiredText("Certification issuer"),
            expiresOn: dateValue("Expiration date"),
          })
          .required(),
      )
      .required(),
  })
  .required();

export const referencesSchema: yup.ObjectSchema<ReferencesForm> = yup
  .object({
    consentToContact: yup
      .boolean()
      .oneOf([true], "Consent is required before submitting references")
      .required(),
    references: yup
      .array()
      .of(
        yup
          .object({
            name: requiredText("Reference name"),
            relationship: requiredText("Reference relationship"),
            email: yup
              .string()
              .trim()
              .required("Reference email is required")
              .email("Enter a valid reference email"),
            phone: requiredText("Reference phone"),
          })
          .required(),
      )
      .min(1, "Add at least one reference")
      .required(),
    additionalNotes: optionalText(),
  })
  .required();
