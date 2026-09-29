"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AlertBox, Button, Stat } from "@/components/ui";
import { OBJETIVOS, REFEICOES_OPC } from "@/components/perfil/steps";
import { CONDICOES } from "@/lib/nutrition/safety";
import { MODOS } from "@/lib/nutrition/planner";
import { confirmarPerfilEGerar, resumoPerfil } from "@/lib/server/actions-perfil";

type Resumo = Awaited<ReturnType<typeof resumoPerfil>>;
const n = (x: number) => x.toLocaleString("pt-BR");

export function Resultado({ irPara }: { irPara: (n: number) => void }) {
  const router = useRouter();
  const [r, setR] = useState<Resumo | null>(null);
  const [tipo, setTipo] = useState<"diario" | "semanal" | "mensal">("semanal");
  const [pendente, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    resumoPerfil().then(setR);
  }, []);

  if (!r) return <p className="text-muted">Analisando suas informações…</p>;
  const { perfil: p, faltando, calc, seguranca } = r;

  if (faltando.length)
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Falta pouco</h2>
        <AlertBox gravidade="atencao" titulo="Antes de gerar o plano, precisamos de:">
          <ul className="list-disc pl-5">{faltando.map((f) => <li key={f}>{f}</li>)}</ul>
        </AlertBox>
        <Button onClick={() => irPara(0)}>Completar informações</Button>
      </div>
    );

  const esconder = seguranca!.esconderCalorias;
  const gerar = () =>
    start(async () => {
      setErro(null);
      const res = await confirmarPerfilEGerar(tipo);
      if (res.ok) {
        router.push("/plano?novo=1");
        router.refresh();
      } else setErro(res.bloqueios?.join(" ") ?? (res.faltando ? `Faltam: ${res.faltando.join(", ")}` : res.erro ?? "Erro ao gerar o plano."));
    });

  const linhas: [string, string, number][] = [
    ["Nome", `${p.nome} · ${r.idade} anos · ${p.sexo}`, 0],
    ["Medidas", `${p.altura} cm · ${String(p.peso).replace(".", ",")} kg · IMC ${calc!.imc.toString().replace(".", ",")} (${calc!.classificacaoImc})`, 0],
    ["Objetivo", `${OBJETIVOS.find((o) => o.id === p.objetivo.principal)?.nome ?? "—"}${p.objetivo.metaPeso ? ` · meta ${p.objetivo.metaPeso} kg` : ""}`, 1],
    ["Rotina", `acorda ${p.rotina.acordar ?? "?"} · dorme ${p.rotina.dormir ?? "?"} · atividade ${p.rotina.nivelAtividade}`, 2],
    ["Refeições", p.alimentacao.refeicoes.map((t) => REFEICOES_OPC.find((x) => x.id === t)?.nome).join(", "), 3],
    ["Saúde", p.saude.condicoes.length ? p.saude.condicoes.map((c) => CONDICOES.find((x) => x.id === c)?.nome ?? c).join(", ") : "Nenhuma condição informada", 4],
    ["Medicamentos", p.medicamentos.length ? p.medicamentos.map((m) => m.nome).join(", ") : "Nenhum", 4],
    ["Alergias/intolerâncias", [...p.saude.alergias, ...p.saude.intolerancias].join(", ") || "Nenhuma", 4],
    ["Exercícios", p.exercicios.length ? p.exercicios.map((e) => `${e.tipo} ${e.frequencia}×/sem`).join(", ") : "Nenhum planejado", 5],
    ["Modo", `${MODOS.find((m) => m.id === p.alimentacao.modo)?.nome}${p.saude.restricoes.length ? ` · ${p.saude.restricoes.join(", ")}` : ""}`, 6],
    ["Orçamento", p.orcamento.diario ? `R$ ${p.orcamento.diario}/dia` : p.orcamento.semanal ? `R$ ${p.orcamento.semanal}/semana` : p.orcamento.mensal ? `R$ ${p.orcamento.mensal}/mês` : "Não definido", 7],
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Confira seu perfil</h2>
        <p className="text-sm text-muted">Revise antes do primeiro plano. Toque em “editar” para corrigir.</p>
      </div>
      <dl className="divide-y divide-line rounded-2xl border border-line">
        {linhas.map(([k, v, e]) => (
          <div key={k} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
            <div>
              <dt className="font-semibold">{k}</dt>
              <dd className="text-muted">{v}</dd>
            </div>
            <button type="button" onClick={() => irPara(e)} className="shrink-0 text-xs font-semibold text-brand">
              editar
            </button>
          </div>
        ))}
      </dl>

      {!esconder && (
        <div>
          <h3 className="mb-2 font-bold">Estimativas iniciais</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat rotulo="Metabolismo basal" valor={`${n(calc!.tmb.faixa.min)}–${n(calc!.tmb.faixa.max)}`} sub="kcal/dia (2 equações)" />
            <Stat rotulo="Gasto diário" valor={`${n(calc!.get.faixa.min)}–${n(calc!.get.faixa.max)}`} sub="kcal/dia" />
            <Stat rotulo="Meta de energia" valor={`${n(calc!.meta.kcal)} kcal`} sub={`faixa ${n(calc!.meta.faixa.min)}–${n(calc!.meta.faixa.max)}`} />
            <Stat rotulo="Proteína" valor={`${calc!.proteina.g} g`} sub={`${calc!.proteina.gPorKg.toString().replace(".", ",")} g/kg`} />
            <Stat rotulo="Fibras" valor={`≥ ${calc!.fibra.g} g`} />
            <Stat rotulo="Água" valor={calc!.agua.ml ? `${n(calc!.agua.ml)} ml` : "Conforme orientação"} />
          </div>
          <p className="mt-2 text-xs text-muted">{calc!.meta.descricao}. São estimativas — vamos ajustar com seus registros.</p>
        </div>
      )}

      {seguranca!.alertas.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold">Pontos de atenção</h3>
          {seguranca!.alertas.map((a) => (
            <AlertBox key={a.regra} gravidade={a.gravidade}>
              {a.mensagem} <span className="block pt-1 font-medium">{a.acao_recomendada}</span>
            </AlertBox>
          ))}
        </div>
      )}

      {seguranca!.bloqueios.length > 0 ? (
        <AlertBox gravidade="importante" titulo="Não vamos gerar um plano automático">
          {seguranca!.bloqueios.join(" ")}
        </AlertBox>
      ) : (
        <div className="space-y-3 rounded-2xl bg-brand-soft p-4">
          <p className="text-sm font-semibold">Qual período de plano você quer começar?</p>
          <div className="flex flex-wrap gap-2">
            {([["diario", "1 dia"], ["semanal", "1 semana"], ["mensal", "1 mês"]] as const).map(([id, t]) => (
              <button key={id} type="button" onClick={() => setTipo(id)} aria-pressed={tipo === id} className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${tipo === id ? "border-brand bg-brand text-white" : "border-line bg-surface"}`}>
                {t}
              </button>
            ))}
          </div>
          {erro && <p className="text-sm text-danger">{erro}</p>}
          <Button onClick={gerar} disabled={pendente} className="w-full">
            {pendente ? "Montando seu plano…" : "Está tudo certo — gerar meu plano"}
          </Button>
        </div>
      )}
    </div>
  );
}
