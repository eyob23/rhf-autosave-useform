# RHF Autosave

Live example: https://eyob23.github.io/rhf-autosave-useform/

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

When navigation is attempted with unsaved changes, `NavigationGuard` displays
a fixed notice while it flushes the form. Successful saves continue to the
requested destination automatically. Failed saves explain why navigation is
paused and provide **Retry and continue** and **Stay here** actions. The notice
can be themed with `--rhf-autosave-navigation-color`,
`--rhf-autosave-navigation-background`,
`--rhf-autosave-navigation-border`, and the shared autosave error/progress
color variables.
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
  <AutoSaveStatusProvider maxLogEntries={200}>
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
  label="Profile"
  retainOnUnmount
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
at the same time by using different keys. By default, a registration is removed
when its form unmounts. Set `retainOnUnmount` to keep its latest snapshot for the
current browser session.

Render the reusable list to show every active or retained autosave:

```tsx
import { TrackedAutoSaveList } from "rhf-autosave";

<TrackedAutoSaveList
  title="Tracked autosaves"
  eyebrow="This browser session"
  emptyMessage="No drafts yet"
/>
```

The component includes the count, active/session labels, live countdown,
saving state, saved time, and errors. Use CSS variables such as
`--rhf-autosave-accent-color`, `--rhf-autosave-border-color`, and
`--rhf-autosave-success-color` to match your application.

Use `useTrackedAutoSaves()` when you need a completely custom presentation:

```tsx
import { useTrackedAutoSaves } from "rhf-autosave";

function AutosaveDashboard() {
  const trackedAutoSaves = useTrackedAutoSaves();

  return (
    <ul>
      {trackedAutoSaves.map(({ statusKey, label, snapshot, isActive }) => (
        <li key={statusKey}>
          <strong>{label}</strong>
          <span>{snapshot.state}</span>
          <span>{isActive ? "Active" : "Session"}</span>
        </li>
      ))}
    </ul>
  );
}
```

## Autosave activity log

`AutoSaveStatusProvider` keeps a structured, browser-session log of controller
state transitions. It records keys, labels, timestamps, durations, and
normalized errors, but never form values. `maxLogEntries` bounds memory usage
and defaults to 200.

Display all events on a dashboard:

```tsx
import { AutoSaveEventLog } from "rhf-autosave";

<AutoSaveEventLog eyebrow="Developer log" />
```

Filter the same log for a specific form or section:

```tsx
<AutoSaveEventLog
  statusKey={`profile:${profileId}`}
  title="Profile autosave activity"
  limit={10}
/>
```

Each filtered component clears only its own history. An unfiltered component
clears the complete session log. For custom presentation, use
`useAutoSaveLog({ statusKey, limit })` and `useClearAutoSaveLog(statusKey)`.
The package emits `change-detected`, `save-started`, `retry-started`,
`save-succeeded`, `save-failed`, and `save-cancelled` event types.

## Testing failure scenarios

The demo includes an API simulation button in the lower-right corner during
development. It changes the in-memory mock API, so browser network throttling
or DevTools offline mode is not required.

Available scenarios:

- **Normal** uses the standard 650 ms save latency.
- **Slow response** waits 5 seconds before saving.
- **Request timeout** waits 20 seconds, exceeding the autosave timeout.
- **Offline** rejects requests with a network-unavailable error.
- **Server error** rejects requests with a simulated HTTP 500 error.
- **Flaky connection** fails according to the adjustable failure rate.

Use **Fail next save** for a deterministic one-time failure followed by normal
recovery. **Affect read requests** applies the selected scenario to loading as
well as saving; it is disabled by default so forms remain available while save
behavior is tested. Settings persist in `sessionStorage` until reset or the
browser session ends. Failed and aborted requests never modify the mock data.

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
      statusLabel="Profile"
      retainStatusOnUnmount
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