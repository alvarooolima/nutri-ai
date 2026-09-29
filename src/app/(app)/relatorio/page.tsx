import type { Metadata } from "next";
import { FOOD_MAP } from "@/data/foods";
import { idadeDe, imcDe } from "@/lib/nutrition/calc";
import { addDias, MODOS } from "@/lib/nutrition/planner";
import { associacoes, AVISO_ASSOCIACAO, tendencia } from "@/lib/nutrition/review";
import { CONDICOES, SINTOMAS_ALERTA } from "@/lib/nutrition/safety";
import { carregarPerfil } from "@/lib/server/perfil";
import { hojeSP, planoAtivo } from "@/lib/server/planos";
import { requireUser } from "@/lib/supabase/server";
import { Imprimir } from "./imprimir";

export const metadata: Metadata = { title: "Relatório para o nutricionista" };

const n1 = (x?: number | null, d = 1) => (x === null || x === undefined || Number.isNaN(x) ? "—" : x.toFixed(d).replace(".", ","));
const data = (d: string) => d.split("-").reverse().join("/");
const OBJ: Record<string, string> = { perda_peso: "Perder peso", manutencao: "Manter o peso", ganho_massa: "Ganhar massa muscular", saude_geral: "Cuidar da saúde", performance: "Desempenho esportivo", melhorar_alimentacao: "Comer melhor" };

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid rounded-2xl border border-line bg-surface p-4 print:rounded-none print:border-0 print:border-t print:p-0 print:pt-3">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-brand">{titulo}</h2>
      {children}
    </section>
  );
}

function Linhas({ itens }: { itens: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {itens.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="tabular font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function Relatorio() {
  const { supabase, user } = await requireUser();
  const hoje = hojeSP();
  const inicio = addDias(hoje, -13);
  const [perfil, plano, { data: t }, { data: logs }, { data: sint }, { data: alertas }] = await Promise.all([
    carregarPerfil(supabase, user.id),
    planoAtivo(supabase, user.id),
    supabase.from("tracking").select("*").eq("user_id", user.id).order("data"),
    supabase.from("food_logs").select("data,hora,descricao,seguiu_plano").eq("user_id", user.id).gte("data", inicio),
    supabase.from("symptoms").select("data,hora,sintoma,intensidade").eq("user_id", user.id).gte("data", addDias(hoje, -60)),
    supabase.from("alerts").select("gravidade,mensagem").eq("user_id", user.id).neq("status", "resolvido"),
  ]);

  const idade = perfil.dataNascimento ? idadeDe(perfil.dataNascimento) : null;
  const imc = perfil.peso && perfil.altura ? imcDe(perfil.peso, perfil.altura) : null;
  const pesos = (t ?? []).filter((x) => x.peso).map((x) => ({ data: x.data as string, peso: Number(x.peso) }));
  const recentes = pesos.filter((p) => p.data >= addDias(hoje, -27));
  const tend = tendencia(recentes);
  const ult14 = (t ?? []).filter((x) => x.data >= inicio);
  const media = (k: string) => {
    const v = ult14.map((x) => (x as Record<string, unknown>)[k]).filter((x): x is number => typeof x === "number");
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const resp = (logs ?? []).filter((l) => l.seguiu_plano);
  const cont = { sim: 0, parcial: 0, nao: 0 } as Record<string, number>;
  for (const l of resp) cont[l.seguiu_plano as string]++;
  const pct = (k: string) => (resp.length ? Math.round((cont[k] / resp.length) * 100) : 0);
  const porSintoma = new Map<string, { n: number; max: number }>();
  for (const s of sint ?? []) {
    const c = porSintoma.get(s.sintoma) ?? { n: 0, max: 0 };
    porSintoma.set(s.sintoma, { n: c.n + 1, max: Math.max(c.max, s.intensidade ?? 0) });
  }
  const assoc = associacoes(logs ?? [], sint ?? []);
  const calc = plano?.calculo as
    | { tmb?: { mifflin: number; harrisBenedict: number }; get?: { faixa: { min: number; max: number } }; meta?: { kcal: number; descricao: string }; alvoUsado?: { kcal: number }; proteina?: { g: number; gPorKg: number }; fibra?: { g: number }; agua?: { ml: number | null }; pal?: { categoria: string } }
    | undefined;
  const nomeSint = (s: string) => SINTOMAS_ALERTA.find((a) => a.id === s)?.nome ?? s;
  const cintura = (t ?? []).filter((x) => x.cintura);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">NUTRI.AI · Relatório para consulta</p>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight">{perfil.nome || "Paciente"}</h1>
          <p className="text-sm text-muted">Gerado em {data(hoje)} · registros dos últimos 14 dias (sintomas: 60 dias)</p>
        </div>
        <Imprimir />
      </div>

      <div className="columns-1 gap-4 md:columns-2 [&>*]:mb-4 print:columns-2 print:text-[11px]">
        <Bloco titulo="Identificação">
          <Linhas
            itens={[
              ["Idade / sexo", `${idade ?? "—"} anos · ${perfil.sexo ?? "—"}`],
              ["Altura", `${perfil.altura ?? "—"} cm`],
              ["Peso atual / inicial", `${n1(perfil.peso)} kg / ${n1(perfil.pesoInicial)} kg`],
              ["IMC", n1(imc)],
              ["Objetivo", `${OBJ[perfil.objetivo.principal ?? ""] ?? "—"}${perfil.objetivo.metaPeso ? ` · meta ${n1(perfil.objetivo.metaPeso)} kg` : ""}`],
              ["Atividade", `${perfil.rotina.nivelAtividade ?? "—"}${perfil.exercicios.length ? ` · ${perfil.exercicios.map((e) => `${e.tipo} ${e.frequencia}×/sem ${e.duracao} min`).join(", ")}` : ""}`],
            ]}
          />
        </Bloco>

        <Bloco titulo="Metas estimadas pelo sistema">
          {calc?.meta ? (
            <Linhas
              itens={[
                ["TMB", `${calc.tmb?.mifflin ?? "—"} (Mifflin) · ${calc.tmb?.harrisBenedict ?? "—"} (H-B) kcal`],
                ["Gasto diário", `${calc.get?.faixa.min}–${calc.get?.faixa.max} kcal · ${calc.pal?.categoria ?? ""}`],
                ["Meta de energia", `${calc.alvoUsado?.kcal ?? calc.meta.kcal} kcal`],
                ["Proteína", `${calc.proteina?.g} g (${n1(calc.proteina?.gPorKg, 2)} g/kg)`],
                ["Fibras / água", `≥ ${calc.fibra?.g} g · ${calc.agua?.ml ? `${calc.agua.ml} ml` : "conforme orientação"}`],
              ]}
            />
          ) : (
            <p className="text-sm text-muted">Sem cardápio ativo.</p>
          )}
          {calc?.meta && <p className="mt-2 text-xs text-muted">{calc.meta.descricao}. Estimativas por equações; validar com avaliação clínica.</p>}
        </Bloco>

        <Bloco titulo="Adesão ao cardápio (14 dias)">
          <Linhas
            itens={[
              ["Refeições respondidas", String(resp.length)],
              ["Seguiu", `${pct("sim")}%`],
              ["Seguiu em parte", `${pct("parcial")}%`],
              ["Comeu outra coisa", `${pct("nao")}%`],
              ["Cardápio atual", plano ? `${MODOS.find((m) => m.id === plano.modo)?.nome} · ${plano.tipo} · ${data(plano.data_inicio)} a ${data(plano.data_fim)}` : "—"],
            ]}
          />
        </Bloco>

        <Bloco titulo="Evolução">
          <Linhas
            itens={[
              ["Tendência de peso (28 dias)", tend === undefined ? "dados insuficientes" : `${tend * 7 >= 0 ? "+" : "−"}${n1(Math.abs(tend * 7), 2)} kg/semana`],
              ["Pesagens registradas", String(pesos.length)],
              ["Cintura", cintura.length ? `${n1(Number(cintura[0].cintura))} → ${n1(Number(cintura[cintura.length - 1].cintura))} cm` : "—"],
              ["Fome média (1–5)", n1(media("fome"))],
              ["Energia média (1–5)", n1(media("energia"))],
              ["Sono médio (1–5)", n1(media("sono"))],
            ]}
          />
        </Bloco>

        <Bloco titulo="Saúde (informado pelo paciente)">
          <Linhas
            itens={[
              ["Condições", perfil.saude.condicoes.map((c) => CONDICOES.find((x) => x.id === c)?.nome ?? c).join(", ") || "nenhuma"],
              ["Medicamentos", perfil.medicamentos.map((m) => `${m.nome}${m.dose ? ` ${m.dose}` : ""}`).join("; ") || "nenhum"],
              ["Suplementos", perfil.suplementos.map((m) => m.nome).join("; ") || "nenhum"],
              ["Alergias", [...perfil.saude.alergias, perfil.saude.anafilaxia ? "(histórico de anafilaxia)" : ""].filter(Boolean).join(", ") || "nenhuma"],
              ["Intolerâncias", perfil.saude.intolerancias.join(", ") || "nenhuma"],
              ["Restrições", perfil.saude.restricoes.join(", ") || "nenhuma"],
              ["Não come", perfil.alimentacao.rejeitados.map((id) => FOOD_MAP[id]?.nome ?? id).join(", ") || "—"],
            ]}
          />
        </Bloco>

        <Bloco titulo="Sintomas (60 dias)">
          {porSintoma.size === 0 ? (
            <p className="text-sm text-muted">Nenhum sintoma registrado.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {[...porSintoma.entries()].map(([s, c]) => (
                <li key={s} className="flex justify-between gap-3">
                  <span>{nomeSint(s)}</span>
                  <span className="tabular text-muted">{c.n}× · máx. {c.max}/10</span>
                </li>
              ))}
            </ul>
          )}
          {assoc.length > 0 && (
            <div className="mt-2 border-t border-line pt-2 text-xs text-muted">
              <p className="font-semibold text-ink">Associações observadas nos registros</p>
              {assoc.slice(0, 4).map((a) => (
                <p key={a.sintoma + a.alimento}>
                  {nomeSint(a.sintoma)} ↔ “{a.alimento}”: {a.ocorrencias}/{a.totalSintoma} ({Math.round(a.taxaComAlimento * 100)}% vs {Math.round(a.taxaBase * 100)}% basal)
                </p>
              ))}
              <p className="mt-1 italic">{AVISO_ASSOCIACAO}</p>
            </div>
          )}
        </Bloco>

        <Bloco titulo="Alertas de segurança ativos">
          {!alertas?.length ? (
            <p className="text-sm text-muted">Nenhum.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {alertas.map((a, i) => (
                <li key={i}>
                  <span className="font-semibold">{a.gravidade === "importante" ? "Importante" : a.gravidade === "atencao" ? "Atenção" : "Info"}:</span> {a.mensagem}
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco titulo="Hábitos e rotina">
          <Linhas
            itens={[
              ["Refeições", perfil.alimentacao.refeicoes.join(", ") || "—"],
              ["Sono", `${perfil.rotina.horasSono ?? "—"} h · ${perfil.rotina.acordar ?? "?"}–${perfil.rotina.dormir ?? "?"}`],
              ["Cozinhar", perfil.rotina.tempoCozinhar ? `até ${perfil.rotina.tempoCozinhar} min/dia` : "—"],
              ["Álcool", perfil.habitos.alcoolDoses !== undefined ? `${perfil.habitos.alcoolDoses} doses/sem` : "—"],
              ["Ultraprocessados", perfil.habitos.ultraprocessados || "—"],
              ["Orçamento", perfil.orcamento.semanal ? `R$ ${perfil.orcamento.semanal}/sem` : perfil.orcamento.mensal ? `R$ ${perfil.orcamento.mensal}/mês` : perfil.orcamento.diario ? `R$ ${perfil.orcamento.diario}/dia` : "—"],
            ]}
          />
        </Bloco>
      </div>
      <p className="mt-2 text-xs text-muted">
        Composição dos alimentos: TACO 4ª ed. e USDA FoodData Central. Este relatório reúne dados informados pelo paciente e estimativas do sistema; não substitui avaliação profissional.
      </p>
    </div>
  );
}
