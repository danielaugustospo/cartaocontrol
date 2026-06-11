import type { ZodError } from "zod";

export type FieldErrors = Record<string, string>;

export const zodToFieldErrors = (error: ZodError): FieldErrors => {
  const flattened = error.flatten().fieldErrors;
  return Object.entries(flattened).reduce<FieldErrors>((acc, [key, messages]) => {
    const firstMessage = Array.isArray(messages) ? messages[0] : undefined;
    if (firstMessage) acc[key] = firstMessage;
    return acc;
  }, {});
};

export const checkboxValue = (value: boolean) => (value ? "true" : "false");
