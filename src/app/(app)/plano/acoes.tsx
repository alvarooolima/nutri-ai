"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCheck, HelpCircle, Minus, PiggyBank, Plus, Sparkles } from "lucide-react";
import { Sheet } from "@/components/plano/refeicao-card";
import { AlertBox, Button, Select, Field, Input } from "@/components/ui";
import { MODOS } from "@/lib/nutrition/planner";
import { ajustarFomeDia, gerarNovoPlano, reduzirCusto } from "@/lib/server/actions-plano";
import { registrarDiaInteiro } from "@/lib/server/actions-registro";
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
    { rotulo: "Mais fome", titulo: "Estou com mais fome hoje: aumenta um pouco as porções, com mais verduras e proteína", icon: Plus, fn: () => ajustarFomeDia(data, "mais") },
    { rotulo: "Menos fome", titulo: "Estou com menos fome hoje: diminui um pouco as porções, mantendo a proteína", icon: Minus, fn: () => ajustarFomeDia(data, "menos") },
    { rotulo: "Gastar menos", titulo: "Troca refeições de hoje em diante por opções mais baratas e equivalentes", icon: PiggyBank, fn: () => reduzirCusto() },
  ];
  return (
    <div className="space-y-2" aria-busy={pendente}>
      <div className="grid grid-cols-3 gap-2">
        {ACOES.map(({ rotulo, titulo, icon: Icon, fn }) => (
          <button
            key={rotulo}
            title={titulo}
            aria-label={titulo}
            disabled={pendente}
            onClick={() => run(fn)}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-line px-1 text-center transition hover:border-brand hover:bg-brand-soft/40 disabled:opacity-60"
          >
            <Icon size={18} className="text-brand" aria-hidden />
            <span className="text-[13px] font-semibold leading-tight">{rotulo}</span>
          </button>
        ))}
      </div>
      {pendente && <p className="text-sm text-muted" role="status">Ajustando o cardápio…</p>}
      {msg && <AlertBox gravidade="info" titulo="Pronto">{msg}</AlertBox>}
    </div>
  );
}

/** Registro em um toque de todas as refeições pendentes do dia */
export function SeguiTudo({ data }: { data: string }) {
  const router = useRouter();
  const [pendente, start] = useTransition();
  return (
    <Button
      variante="suave"
      tamanho="sm"
      disabled={pendente}
      onClick={() =>
        start(async () => {
          await registrarDiaInteiro(data);
          router.refresh();
        })
      }
    >
      <CheckCheck size={16} /> {pendente ? "Registrando…" : "Segui tudo neste dia"}
    </Button>
  );
}

/** Ajuda curta num único botão, para não ocupar espaço vertical */
export function Ajuda({ aberta = false }: { aberta?: boolean }) {
  const [open, setOpen] = useState(aberta);
  return (
    <>
      <Button variante="fantasma" tamanho="sm" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <HelpCircle size={16} /> Como usar
      </Button>
      {open && (
        <Sheet titulo="Como usar o cardápio" onClose={() => setOpen(false)}>
          <ol className="space-y-3 text-[15px] leading-relaxed">
            {[
              ["Escolha o dia", "com as setas ou pelo calendário."],
              ["Toque numa refeição", "para ver o que comer e as quantidades."],
              ["Depois de comer, responda", "“Sim”, “Só parte” ou “Outra coisa”. Se seguiu tudo, use “Segui tudo neste dia”."],
              ["Precisa mudar algo?", "Use “Trocar algo” dentro da refeição, ou os ajustes do dia (mais fome, menos fome, gastar menos)."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-strong">{i + 1}</span>
                <span>
                  <strong>{t}</strong> {d}
                </span>
              </li>
            ))}
          </ol>
        </Sheet>
      )}
    </>
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
