export type FormFieldType =
  | "text"
  | "email"
  | "number"
  | "textarea"
  | "select"
  | "checkbox"
  | "date";

type FormFieldBase<TType extends FormFieldType = FormFieldType> = {
  id: string;
  label: string;
  type: TType;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
};

type SelectField = FormFieldBase<"select"> & {
  options: string[];
};

type NonSelectField = FormFieldBase<Exclude<FormFieldType, "select">>;

export type FormFieldDefinition = SelectField | NonSelectField;

export type DynamicFormDefinition = {
  id: string;
  key: string;
  title: string;
  description?: string;
  eventId?: string | null;
  audience: "teachers" | "volunteers" | "public";
  fields: FormFieldDefinition[];
};

export type FormSubmissionPayload = Record<string, string | number | boolean>;
