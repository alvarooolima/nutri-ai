"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Chips } from "@/components/perfil/steps";
import { AlertBox, Button, Card, Field, Input } from "@/components/ui";
import { SINTOMAS_ALERTA, SINTOMAS_COMUNS } from "@/lib/nutrition/safety";
import { registrarSintoma } from "@/lib/server/actions-registro";

export function FormSintoma() {
  const router = useRouter();
  const [pendente, start] = useTransition();
  const [v, setV] = useState({ sintoma: "", outro: "", intensidade: 5, duracao: "", relacao_com_alimento: "", observacoes: "" });
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const opcoes = [...SINTOMAS_COMUNS.map((x) => ({ id: x, nome: x })), ...SINTOMAS_ALERTA];
  return (
    <Card className="space-y-4">
      <h2 className="font-bold">Novo registro</h2>
      <Field label="O que você está sentindo?">
        <Chips opcoes={opcoes} valor={v.sintoma ? [v.sintoma] : []} onChange={(x) => setV({ ...v, sintoma: x[0] ?? "" })} multiplo={false} />
        <Input className="mt-2" placeholder="Outro sintoma" value={v.outro} onChange={(e) => setV({ ...v, outro: e.target.value, sintoma: "" })} />
      </Field>
      <Field label={`Intensidade: ${v.intensidade}/10`}>
        <input type="range" min={0} max={10} value={v.intensidade} onChange={(e) => setV({ ...v, intensidade: Number(e.target.value) })} className="w-full" aria-label="Intensidade" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Duração">
          <Input value={v.duracao} onChange={(e) => setV({ ...v, duracao: e.target.value })} placeholder="ex.: 2 horas" />
        </Field>
        <Field label="Percebeu depois de comer algo?">
          <Input value={v.relacao_com_alimento} onChange={(e) => setV({ ...v, relacao_com_alimento: e.target.value })} placeholder="ex.: leite no café" />
        </Field>
      </div>
      <Field label="Observações (privadas, criptografadas)">
        <Input value={v.observacoes} onChange={(e) => setV({ ...v, observacoes: e.target.value })} />
      </Field>
      {msg && (msg.ok ? <p className="text-sm font-medium text-brand-strong" role="status">{msg.texto}</p> : <AlertBox gravidade="importante">{msg.texto}</AlertBox>)}
      <Button
        className="w-full"
        disabled={pendente || !(v.sintoma || v.outro.trim())}
        onClick={() =>
          start(async () => {
            const nome = SINTOMAS_ALERTA.find((s) => s.id === v.sintoma) ? v.sintoma : v.sintoma || v.outro.trim();
            const r = await registrarSintoma({ sintoma: nome, intensidade: v.intensidade, duracao: v.duracao, relacao_com_alimento: v.relacao_com_alimento, observacoes: v.observacoes });
            setMsg(r.alerta ? { ok: false, texto: r.alerta } : { ok: true, texto: "Sintoma registrado." });
            setV({ sintoma: "", outro: "", intensidade: 5, duracao: "", relacao_com_alimento: "", observacoes: "" });
            router.refresh();
          })
        }
      >
        Registrar sintoma
      </Button>
    </Card>
  );
}
