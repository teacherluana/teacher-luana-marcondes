"use client";

import { useFormStatus } from "react-dom";

export function HotmartImportButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="button"
      type="submit"
      disabled={pending}
      style={{
        opacity: pending ? 0.7 : 1,
        cursor: pending ? "wait" : "pointer",
      }}
    >
      {pending
        ? "Importando... aguarde"
        : "Importar selecionados"}
    </button>
  );
}