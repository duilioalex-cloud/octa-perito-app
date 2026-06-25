"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingText = "Processando..." }: { children: React.ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="button button-primary button-full" type="submit" disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
