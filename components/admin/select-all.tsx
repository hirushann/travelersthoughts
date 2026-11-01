"use client";

/** Header checkbox that ticks every `name` checkbox in the same form. */
export function SelectAll({ name, label }: { name: string; label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      className="size-4 accent-accent"
      onChange={(e) => {
        for (const box of e.currentTarget.form?.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`) ?? []) {
          box.checked = e.currentTarget.checked;
        }
      }}
    />
  );
}
