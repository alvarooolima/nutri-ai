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
  const ACOES = [
    { rotulo: "Estou com mais fome hoje", apoio: "Aumenta um pouco as porções, com mais verduras e proteína", icon: Plus, fn: () => ajustarFomeDia(data, "mais") },
    { rotulo: "Estou com menos fome hoje", apoio: "Diminui um pouco as porções, mantendo a proteína", icon: Minus, fn: () => ajustarFomeDia(data, "menos") },
    { rotulo: "Quero gastar menos", apoio: "Troca refeições de hoje em diante por opções mais baratas e equivalentes", icon: PiggyBank, fn: () => reduzirCusto() },
  ];
  return (
    <div className="space-y-2" aria-busy={pendente}>
      {ACOES.map(({ rotulo, apoio, icon: Icon, fn }) => (
        <button
          key={rotulo}
          disabled={pendente}
          onClick={() => run(fn)}
          className="flex min-h-16 w-full items-center gap-3.5 rounded-2xl border border-line/80 bg-surface px-4 py-3 text-left shadow-card transition hover:border-brand hover:bg-brand-soft/40 disabled:opacity-60"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Icon size={20} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[16px] font-semibold leading-snug">{rotulo}</span>
            <span className="block text-[13px] text-muted">{apoio}</span>
          </span>
        </button>
      ))}
      {pendente && <p className="text-[15px] text-muted" role="status">Ajustando o cardápio…</p>}
      {msg && <AlertBox gravidade="info" titulo="Pronto">{msg}</AlertBox>}
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
      <Button variante="secundario" tamanho="sm" onClick={() => setOpen(true)}>
        <Sparkles size={16} className="text-brand" /> Novo plano
      </Button>
      {open && (
        <Sheet titulo="Gerar novo plano" onClose={() => setOpen(false)}>
          {form}
        </Sheet>
      )}
    </>
  );
}
