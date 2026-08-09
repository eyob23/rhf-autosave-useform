export type PersonalForm = {
  firstName: string;
  lastName: string;
  preferredName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  contactPreference: "email" | "phone";
};

export type EmploymentItem = {
  employer: string;
  title: string;
  startDate: string;
  endDate: string;
  current: boolean;
  responsibilities: string;
};

export type EmploymentForm = {
  employmentStatus: "employed" | "self-employed" | "unemployed" | "student";
  history: EmploymentItem[];
};

export type EducationItem = {
  institution: string;
  qualification: string;
  fieldOfStudy: string;
  graduationYear: number | null;
};

export type EducationForm = {
  highestLevel: string;
  education: EducationItem[];
  certifications: { name: string; issuer: string; expiresOn: string }[];
};

export type ReferencesForm = {
  consentToContact: boolean;
  references: {
    name: string;
    relationship: string;
    email: string;
    phone: string;
  }[];
  additionalNotes: string;
};

export const emptyPersonalForm = (): PersonalForm => ({
  firstName: "",
  lastName: "",
  preferredName: "",
  dateOfBirth: "",
  email: "",
  phone: "",
  address: {
    line1: "",
    line2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
  },
  contactPreference: "email",
});

export const emptyEmploymentItem = (): EmploymentItem => ({
  employer: "",
  title: "",
  startDate: "",
  endDate: "",
  current: false,
  responsibilities: "",
});

export const emptyEmploymentForm = (): EmploymentForm => ({
  employmentStatus: "employed",
  history: [emptyEmploymentItem()],
});

export const emptyEducationItem = (): EducationItem => ({
  institution: "",
  qualification: "",
  fieldOfStudy: "",
  graduationYear: null,
});

export const emptyEducationForm = (): EducationForm => ({
  highestLevel: "",
  education: [emptyEducationItem()],
  certifications: [],
});

export const emptyReferencesForm = (): ReferencesForm => ({
  consentToContact: false,
  references: [{ name: "", relationship: "", email: "", phone: "" }],
  additionalNotes: "",
});
