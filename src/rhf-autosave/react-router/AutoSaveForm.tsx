import type { PropsWithChildren } from "react";
import {
  FormProvider,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import { AppExitGuard } from "../AppExitGuard";
import { AutoSaveStatusRegistration } from "../AutoSaveStatusRegistry";
import { NavigationGuard } from "./NavigationGuard";
import type { AutoSaveController } from "../types";

type Props<T extends FieldValues> = PropsWithChildren<{
  form: UseFormReturn<T>;
  controller: AutoSaveController;
  statusKey?: string;
}>;

export function AutoSaveForm<T extends FieldValues>({
  form,
  controller,
  statusKey,
  children,
}: Props<T>) {
  return (
    <FormProvider {...form}>
      {statusKey && (
        <AutoSaveStatusRegistration
          statusKey={statusKey}
          controller={controller}
        />
      )}
      <NavigationGuard controller={controller} />
      <AppExitGuard controller={controller} />
      {children}
    </FormProvider>
  );
}
