"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ETAPAS } from "@/components/perfil/steps";
import { AlertBox, Card, cx } from "@/components/ui";
import type { PerfilCompleto } from "@/lib/server/perfil";

const ABAS = [0, 1, 2, 3, 5, 6, 7]; // Saúde fica em área própria

export function EditorPerfil({ perfil, aba }: { perfil: PerfilCompleto; aba: number }) {
  const router = useRouter();
  const [atual, setAtual] = useState(ABAS.includes(aba) ? aba : 0);
  const [salvo, setSalvo] = useState(false);
  const C = ETAPAS[atual].C;
  return (
    <>
      <div className="-mx-4 mb-4 flex gap-2 scroll-x px-4 pb-1">
        {ABAS.map((i) => (
          <button key={i} onClick={() => { setAtual(i); setSalvo(false); }} className={cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold", atual === i ? "border-brand bg-brand text-white" : "border-line bg-surface")}>
            {ETAPAS[i].nome}
          </button>
        ))}
        <Link href="/saude" className="shrink-0 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-semibold">Saúde →</Link>
      </div>
      {salvo && (
        <div className="mb-4">
          <AlertBox gravidade="info" titulo="Alterações salvas">
            Para aplicar ao cardápio, <Link href="/plano" className="font-semibold underline">gere um novo plano</Link>.
          </AlertBox>
        </div>
      )}
      <Card>
        <C key={atual} p={perfil} rotulo="Salvar" onSalvo={() => { setSalvo(true); router.refresh(); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      </Card>
    </>
  );
}
