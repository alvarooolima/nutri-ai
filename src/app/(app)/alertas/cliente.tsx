"use client";

import { useTransition } from "react";
import { atualizarAlerta } from "@/lib/server/actions-registro";

export function MarcarLido({ id, lido }: { id: string; lido: boolean }) {
  const [pendente, start] = useTransition();
  return (
    <button disabled={pendente} onClick={() => start(() => atualizarAlerta(id, lido ? "ativo" : "lido"))} className="mt-2 text-xs font-semibold underline">
      {lido ? "Marcar como não lido" : "Entendi"}
    </button>
  );
}
