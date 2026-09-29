"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { concederConsentimentoSaude, excluirConta, revogarConsentimentoSaude } from "@/lib/server/actions-registro";

export function Consentimento({ ativo }: { ativo: boolean }) {
  const router = useRouter();
  const [pendente, start] = useTransition();
  const [confirmar, setConfirmar] = useState(false);
  if (!ativo)
    return (
      <div className="rounded-2xl bg-surface-2 p-3 text-sm">
        <p>O consentimento para dados de saúde está <strong>revogado</strong>. Sem ele, não usamos condições e medicamentos na segurança do plano.</p>
        <Button className="mt-2" variante="suave" disabled={pendente} onClick={() => start(async () => { await concederConsentimentoSaude(); router.refresh(); })}>
          Autorizar tratamento de dados de saúde
        </Button>
      </div>
    );
  return (
    <div className="rounded-2xl bg-surface-2 p-3 text-sm">
      <p>Consentimento para dados de saúde: <strong>ativo</strong>.</p>
      {!confirmar ? (
        <button className="mt-1 font-semibold text-danger underline" onClick={() => setConfirmar(true)}>Revogar e apagar dados de saúde</button>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-danger">Isso apaga condições, medicamentos, suplementos e o diário de sintomas. Continuar?</p>
          <div className="flex gap-2">
            <Button variante="perigo" disabled={pendente} onClick={() => start(async () => { await revogarConsentimentoSaude(); setConfirmar(false); router.refresh(); })}>Revogar e apagar</Button>
            <Button variante="secundario" onClick={() => setConfirmar(false)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExcluirConta() {
  const [txt, setTxt] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();
  return (
    <div className="space-y-2">
      <label className="block text-sm">
        Digite <strong>EXCLUIR</strong> para confirmar
        <Input className="mt-1" value={txt} onChange={(e) => setTxt(e.target.value)} autoComplete="off" />
      </label>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <Button
        variante="perigo"
        disabled={pendente || txt.trim().toUpperCase() !== "EXCLUIR"}
        onClick={() =>
          start(async () => {
            const r = await excluirConta(txt);
            if (r && !r.ok) setErro(r.erro ?? "Erro");
          })
        }
      >
        Excluir minha conta definitivamente
      </Button>
    </div>
  );
}
