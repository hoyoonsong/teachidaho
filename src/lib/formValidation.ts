import type {
  DynamicFormDefinition,
  FormFieldDefinition,
  FormSubmissionPayload,
} from "../types/forms";

type ValidationErrors = Record<string, string>;

function isMissingRequired(field: FormFieldDefinition, value: unknown) {
  if (!field.required) return false;
  if (field.type === "checkbox") return value !== true;
  return value === undefined || value === null || String(value).trim() === "";
}

export function validateFormValues(
  definition: DynamicFormDefinition,
  values: FormSubmissionPayload,
) {
  const errors: ValidationErrors = {};

  definition.fields.forEach((field) => {
    const rawValue = values[field.id];
    if (isMissingRequired(field, rawValue)) {
      errors[field.id] = "This field is required.";
      return;
    }

    if (!rawValue && !field.required) return;

    if (field.type === "email" && !String(rawValue).includes("@")) {
      errors[field.id] = "Please enter a valid email.";
    }

    if (field.type === "number" && Number.isNaN(Number(rawValue))) {
      errors[field.id] = "Please enter a valid number.";
    }

    if (field.type === "select" && field.options.length > 0) {
      if (!field.options.includes(String(rawValue))) {
        errors[field.id] = "Please choose a valid option.";
      }
    }
  });

  return errors;
}
