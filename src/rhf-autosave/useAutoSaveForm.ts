import { useEffect, useRef } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type UseFormProps,
} from "react-hook-form";
import { useAutoSave, type AutoSaveFunction } from "./useAutoSave";

const areJsonValuesEqual = <T extends FieldValues>(current: T, next: T) =>
  JSON.stringify(current) === JSON.stringify(next);

type Options<T extends FieldValues> = Omit<
  UseFormProps<T>,
  "defaultValues" | "values"
> & {
  defaultValues: DefaultValues<T>;
  values?: T;
  save: AutoSaveFunction<T>;
  debounceMs?: number;
  requestTimeoutMs?: number;
  snapshot?: (values: T) => T;
  formatError?: (error: unknown) => string;
  isEqual?: (current: T, next: T) => boolean;
};

/**
 * Create a React Hook Form instance wired to autosave and refresh-safe
 * server values.
 *
 * This hook owns the form, initializes the autosave controller after server
 * data is reset, and preserves dirty local edits when fresh values arrive.
 */
export function useAutoSaveForm<T extends FieldValues>({
  defaultValues,
  values,
  save,
  debounceMs,
  requestTimeoutMs,
  snapshot,
  formatError,
  isEqual = areJsonValuesEqual,
  ...formOptions
}: Options<T>) {
  const isEqualRef = useRef(isEqual);
  isEqualRef.current = isEqual;
  const form = useForm<T>({ ...formOptions, defaultValues });
  const autosave = useAutoSave({
    form,
    save,
    debounceMs,
    requestTimeoutMs,
    snapshot,
    formatError,
  });

  useEffect(() => {
    if (!values) return;
    if (autosave.isInitialized()) {
      if (autosave.hasUnsavedChanges()) return;
      if (isEqualRef.current(form.getValues(), values)) return;
    }
    form.reset(values);
    autosave.initialize();
  }, [autosave, form, values]);

  return { form, autosave };
}
