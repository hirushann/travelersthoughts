"use client";

import type { ComponentProps } from "react";

/** A submit button that asks before sending its form. */
export function ConfirmSubmit({ message, ...props }: ComponentProps<"button"> & { message: string }) {
  return (
    <button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    />
  );
}
