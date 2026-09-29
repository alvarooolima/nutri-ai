"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { AlertBox, Button, Field, Input, cx } from "@/components/ui";
import { gerarNovoPlano } from "@/lib/server/actions-plano";
import { marcarDiaDesafio } from "@/lib/server/actions-registro";

export function IniciarDesafio({ inicio }: { inicio: string }) {
  const router = useRouter();
  const [data, setData] = useState(inicio);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();
  return (
    <div className="mt-4 space-y-3">
      <Field label="Começar em">
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="max-w-xs" />
      </Field>
      {erro && <AlertBox gravidade="importante">{erro}</AlertBox>}
      <Button
        disabled={pendente}
        onClick={() =>
          start(async () => {
            const r = await gerarNovoPlano("mensal", "japonesa", data, "japones-31");
            if (r.ok) router.refresh();
            else setErro(r.bloqueios?.join(" ") ?? (r.faltando ? `Complete seu perfil: ${r.faltando.join(", ")}` : r.erro ?? "Erro"));
          })
        }
      >
        {pendente ? "Montando os 31 dias…" : "Começar o desafio"}
      </Button>
      <p className="text-xs text-muted">Seu plano atual fica salvo no histórico.</p>
    </div>
  );
}

export function DiaCheck({ dia, feito }: { dia: number; feito: boolean }) {
  const [v, setV] = useOptimistic(feito);
  const [, start] = useTransition();
  return (
    <button
      aria-pressed={v}
      aria-label={`Marcar dia ${dia} como concluído`}
      onClick={() => start(async () => { setV(!v); await marcarDiaDesafio(dia, !v); })}
      className={cx("flex size-9 items-center justify-center rounded-full border", v ? "border-brand bg-brand text-white" : "border-line text-transparent hover:text-muted")}
    >
      <Check size={16} />
    </button>
  );
}
