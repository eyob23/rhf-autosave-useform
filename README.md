# RHF Autosave

Autosave for React Hook Form with debouncing, request cancellation, retries,
save status, and an optional React Router navigation guard.

## Installation

The package source currently lives in `src/rhf-autosave` in this repository.
After publishing it, install it with its React peer dependencies:

```bash
npm install rhf-autosave react react-hook-form
```

Install React Router only when using the optional router integration:

```bash
npm install react-router-dom
```

## Simple example

Provide the initial values and an async `save` function. The function receives
the current form values and an `AbortSignal`.

```tsx
import { FormProvider } from "react-hook-form";
import {
  AppExitGuard,
  AutoSaveStatus,
  useAutoSaveForm,
} from "rhf-autosave";

type ProfileForm = {
  firstName: string;
  email: string;
};

const initialProfile: ProfileForm = {
  firstName: "Ada",
  email: "ada@example.com",
};

export function ProfileEditor() {
  const { form, autosave } = useAutoSaveForm<ProfileForm>({
    defaultValues: initialProfile,
    values: initialProfile,
    save: async (values, signal) => {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        signal,
      });

      if (!response.ok) throw new Error("Unable to save profile");
    },
  });

  return (
    <FormProvider {...form}>
      <AppExitGuard controller={autosave} />

      <form>
        <label>
          First name
          <input {...form.register("firstName")} />
        </label>

        <label>
          Email
          <input type="email" {...form.register("email")} />
        </label>

        <AutoSaveStatus controller={autosave} />
      </form>
    </FormProvider>
  );
}
```

`AutoSaveStatus` displays the complete lifecycle:

- `Ready`
- `Autosaving in 1.0s`
- `Saving...`
- `Saved`
- An error with a retry action

The default debounce is 1 second. Changes made while a request is running are
saved in a follow-up request.

## Loading server values

Pass fetched data through `values`. Initial data is adopted without triggering
a save. Later server updates are adopted only while the form has no unsaved
local changes.

```tsx
const { data } = useProfileQuery(profileId);

const { form, autosave } = useAutoSaveForm({
  defaultValues: emptyProfile,
  values: data,
  save: updateProfile,
});
```

Your save adapter can use `fetch`, Axios, RTK Query, TanStack Query, or any other
data layer. It only needs to return a promise and respect the supplied
`AbortSignal` when possible.

## Display status anywhere

Use the status registry when the status belongs in a header, sidebar, toolbar,
or another component outside the form.

Wrap the shared component tree once:

```tsx
import { AutoSaveStatusProvider } from "rhf-autosave";

root.render(
  <AutoSaveStatusProvider>
    <App />
  </AutoSaveStatusProvider>,
);
```

Register a form with a unique key:

```tsx
import { AutoSaveStatusRegistration } from "rhf-autosave";

<AutoSaveStatusRegistration
  statusKey={`profile:${profileId}`}
  controller={autosave}
/>
```

Display that form's status anywhere below the provider:

```tsx
import { RegisteredAutoSaveStatus } from "rhf-autosave";

<RegisteredAutoSaveStatus
  statusKey={`profile:${profileId}`}
  fallback={<span>Ready</span>}
/>
```

The registered display includes the same live countdown, saving state, saved
time, errors, and retry action as `AutoSaveStatus`. Multiple forms can register
at the same time by using different keys. A registration is removed when its
form unmounts.

## React Router

Use `AutoSaveForm` when the form is rendered inside React Router. It provides
React Hook Form context, registers an optional global status key, warns about
closing the page with unsaved changes, and waits for pending changes before
route navigation.

```tsx
import { useAutoSaveForm } from "rhf-autosave";
import { AutoSaveForm } from "rhf-autosave/react-router";

function ProfileRoute() {
  const { form, autosave } = useAutoSaveForm({
    defaultValues: emptyProfile,
    values: profile,
    save: updateProfile,
  });

  return (
    <AutoSaveForm
      form={form}
      controller={autosave}
      statusKey="active-profile"
    >
      <input {...form.register("firstName")} />
    </AutoSaveForm>
  );
}
```

Display the registered status from a header or layout:

```tsx
import { RegisteredAutoSaveStatus } from "rhf-autosave";

function AppHeader() {
  return (
    <header>
      <RegisteredAutoSaveStatus statusKey="active-profile" />
    </header>
  );
}
```

`AutoSaveStatusProvider` must wrap both `ProfileRoute` and `AppHeader` when a
`statusKey` is supplied.

## Configuration

```tsx
useAutoSaveForm({
  defaultValues,
  values,
  save,
  debounceMs: 1500,
  requestTimeoutMs: 20_000,
  snapshot: values => structuredClone(values),
  isEqual: (current, incoming) => deepEqual(current, incoming),
  formatError: error => getErrorMessage(error),
});
```

| Option | Purpose | Default |
| --- | --- | --- |
| `defaultValues` | Initial React Hook Form values | Required |
| `values` | Initial or refreshed server values | Optional |
| `save` | Persists `(values, signal)` | Required |
| `debounceMs` | Delay after the latest edit | `1000` |
| `requestTimeoutMs` | Maximum save request duration | `15000` |
| `snapshot` | Creates the values sent to `save` | `structuredClone` |
| `isEqual` | Compares current and incoming server values | JSON equality |
| `formatError` | Converts a rejected value into user-facing text | Built in |

All other React Hook Form options, such as `mode`, `disabled`, and validation
settings, can be passed to `useAutoSaveForm` normally.

## Existing `useForm` instances

Use `useAutoSave` directly when you already own the React Hook Form instance:

```tsx
const form = useForm<ProfileForm>({ defaultValues });
const autosave = useAutoSave({ form, save });

useEffect(() => {
  form.reset(serverValues);
  autosave.initialize();
}, [autosave, form, serverValues]);
```

Call `initialize()` immediately after loading or resetting the initial values.
This marks those values as the saved baseline.

## Save endpoint expectations

- Prefer idempotent update endpoints because a timed-out request may still
  finish before a retry reaches the server.
- Throw or reject when saving fails so the package can display the error and
  offer Retry.
- Browser-close persistence is best effort. For guaranteed recovery, persist
  drafts on the server and consider a dedicated `sendBeacon` or keepalive
  endpoint.

## Run this example application

```bash
npm install
npm run dev
```