import type { ReactNode } from "react";
import { mutateStaff } from "@/app/staff/actions";
import { Field } from "@/components/fields";
import { Button } from "@/components/ui/button";
import {
  roleLabels,
  roles,
  staffLanguages,
  type Employee,
  type StaffLanguage,
} from "@/lib/staff/types";

export function StaffForm({
  action,
  section,
  fields = {},
  children,
  label,
  inline = false,
}: {
  action: string;
  section: string;
  fields?: Record<string, string | number>;
  children?: ReactNode;
  label: string;
  inline?: boolean;
}) {
  return (
    <form
      action={mutateStaff}
      className={inline ? "staff-form-inline" : "panel editor"}
    >
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="return_to" value={section} />
      {Object.entries(fields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      {children}
      <div>
        <Button variant={inline ? "outline" : "default"}>{label}</Button>
      </div>
    </form>
  );
}

const labels: Record<StaffLanguage, string> = {
  fr: "Français",
  darija: "Darija",
  ar: "العربية",
  en: "English",
};
export function LanguageField({
  defaultValue = "fr",
}: {
  defaultValue?: StaffLanguage;
}) {
  return (
    <Field label="Langue">
      <select name="language" defaultValue={defaultValue}>
        {staffLanguages.map((code) => (
          <option key={code} value={code}>
            {labels[code]}
          </option>
        ))}
      </select>
    </Field>
  );
}
export function EmployeeField({
  name,
  label,
  list,
  initial,
  required = false,
}: {
  name: string;
  label: string;
  list: Employee[];
  initial?: string | null;
  required?: boolean;
}) {
  return (
    <Field label={label}>
      <select name={name} defaultValue={initial ?? ""} required={required}>
        <option value="">
          {required ? "Choisir un membre" : "Sans affectation"}
        </option>
        {list
          .filter((item) => item.active || item.id === initial)
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
      </select>
    </Field>
  );
}
export function RoleField({ initial }: { initial?: Employee["role"] }) {
  return (
    <Field label="Rôle">
      <select name="role" defaultValue={initial ?? "advisor"}>
        {roles
          .filter((role) => role !== "admin")
          .map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
      </select>
    </Field>
  );
}
