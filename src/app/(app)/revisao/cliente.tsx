"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { gerarRevisao, responderRevisao } from "@/lib/server/actions-registro";

export function NovaRevisao() {
  const router = useRouter();
  const [pendente, start] = useTransition();
  return (
    <Button className="w-full" disabled={pendente} onClick={() => start(async () => { await gerarRevisao(); router.refresh(); })}>
      {pendente ? "Analisando seus registros…" : "Fazer revisão agora"}
    </Button>
  );
}

export function Responder({ id, temMudanca }: { id: string; temMudanca: boolean }) {
  const router = useRouter();
  const [pendente, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const responder = (aceitar: boolean) =>
    start(async () => {
      const r = await responderRevisao(id, aceitar);
      setMsg(r.mensagem ?? null);
      router.refresh();
    });
  return (
    <div className="space-y-2 rounded-2xl bg-brand-soft p-4">
      <p className="text-sm font-semibold">{temMudanca ? "Quer aplicar esses ajustes? Vamos gerar uma nova versão do plano." : "Confirma que vamos manter o plano?"}</p>
      <div className="flex gap-2">
        <Button disabled={pendente} onClick={() => responder(true)} className="flex-1">{temMudanca ? "Aplicar ajustes" : "Confirmar"}</Button>
        {temMudanca && <Button variante="secundario" disabled={pendente} onClick={() => responder(false)}>Manter como está</Button>}
      </div>
      {msg && <p className="text-sm" role="status">{msg}</p>}
    </div>
  );
}
