"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingText = "Processando...", className = "button button-primary button-full" }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
