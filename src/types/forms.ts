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
  /** When set, enables a 3-column md grid; span per field (3 = full row). */
  layout?: {
    mdColSpan?: 1 | 2 | 3;
  };
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
  audience: "teachers" | "volunteers" | "public" | "students";
  fields: FormFieldDefinition[];
};

export type FormSubmissionPayload = Record<string, string | number | boolean>;
