"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Minus, PiggyBank, Plus, Sparkles } from "lucide-react";
import { Sheet } from "@/components/plano/refeicao-card";
import { AlertBox, Button, Select, Field, Input } from "@/components/ui";
import { MODOS } from "@/lib/nutrition/planner";
import { ajustarFomeDia, gerarNovoPlano, reduzirCusto } from "@/lib/server/actions-plano";
import type { Modo } from "@/lib/types";

export function AcoesDia({ data }: { data: string }) {
  const router = useRouter();
  const [pendente, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<{ mensagem?: string } | undefined>) =>
    start(async () => {
      const r = await fn();
      setMsg(r?.mensagem ?? null);
      router.refresh();
    });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variante="secundario" className="min-h-9 text-xs" disabled={pendente} onClick={() => run(() => ajustarFomeDia(data, "mais"))}>
          <Plus size={14} /> Estou com mais fome hoje
        </Button>
        <Button variante="secundario" className="min-h-9 text-xs" disabled={pendente} onClick={() => run(() => ajustarFomeDia(data, "menos"))}>
          <Minus size={14} /> Menos fome hoje
        </Button>
        <Button variante="secundario" className="min-h-9 text-xs" disabled={pendente} onClick={() => run(() => reduzirCusto())}>
          <PiggyBank size={14} /> Reduzir custo
        </Button>
      </div>
      {pendente && <p className="text-xs text-muted">Ajustando…</p>}
      {msg && <AlertBox gravidade="info" titulo="Feito">{msg}</AlertBox>}
    </div>
  );
}

export function NovoPlano({ aberto = false, modoAtual }: { aberto?: boolean; modoAtual?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendente, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"diario" | "semanal" | "mensal">("semanal");
  const [modo, setModo] = useState<string>(modoAtual ?? "");
  const [inicio, setInicio] = useState("");

  const form = (
    <div className="space-y-4">
      <Field label="Período">
        <div className="flex gap-2">
          {([["diario", "Diário"], ["semanal", "Semanal"], ["mensal", "Mensal"]] as const).map(([id, t]) => (
            <button key={id} type="button" onClick={() => setTipo(id)} aria-pressed={tipo === id} className={`min-h-10 flex-1 rounded-2xl border text-sm font-semibold ${tipo === id ? "border-brand bg-brand text-white" : "border-line"}`}>
              {t}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Modo de alimentação">
        <Select value={modo} onChange={(e) => setModo(e.target.value)}>
          <option value="">Usar o do meu perfil</option>
          {MODOS.map((m) => (
            <option key={m.id} value={m.id}>{m.nome}</option>
          ))}
        </Select>
      </Field>
      <Field label="Começar em (opcional)">
        <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
      </Field>
      {erro && <AlertBox gravidade="importante">{erro}</AlertBox>}
      <Button
        className="w-full"
        disabled={pendente}
        onClick={() =>
          start(async () => {
            setErro(null);
            const r = await gerarNovoPlano(tipo, (modo || undefined) as Modo | undefined, inicio || undefined);
            if (r.ok) {
              setOpen(false);
              router.push("/plano");
              router.refresh();
            } else setErro(r.bloqueios?.join(" ") ?? (r.faltando ? `Complete seu perfil: ${r.faltando.join(", ")}` : r.erro ?? "Erro"));
          })
        }
      >
        <Sparkles size={16} /> {pendente ? "Gerando…" : "Gerar plano"}
      </Button>
      <p className="text-xs text-muted">O plano atual fica salvo no histórico.</p>
    </div>
  );

  if (aberto) return form;
  return (
    <>
      <Button variante="suave" onClick={() => setOpen(true)}>
        <Sparkles size={16} /> Novo plano
      </Button>
      {open && (
        <Sheet titulo="Gerar novo plano" onClose={() => setOpen(false)}>
          {form}
        </Sheet>
      )}
    </>
  );
}
