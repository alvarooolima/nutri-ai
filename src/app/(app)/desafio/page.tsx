import type { Metadata } from "next";
import Link from "next/link";
import { RECIPE_MAP } from "@/data/recipes";
import { Card, PageHeader, Progress, Stat } from "@/components/ui";
import { brl, macrosItens } from "@/lib/nutrition/foodmath";
import { agruparPorDia, hojeSP, planoAtivo, refeicoesDoPlano } from "@/lib/server/planos";
import { requireUser } from "@/lib/supabase/server";
import { DiaCheck, IniciarDesafio } from "./cliente";

export const metadata: Metadata = { title: "Desafio 31 dias — Alimentação Japonesa" };

const PRINCIPIOS = [
  ["Ichiju sansai", "Uma sopa e três acompanhamentos: arroz, uma proteína, vegetais e sopa — equilíbrio sem contar tudo."],
  ["Cozido, grelhado, no vapor", "Preparações simples no lugar de frituras e molhos prontos."],
  ["Peixe, soja e ovos", "Menos carne vermelha; mais peixes (inclusive sardinha, acessível), tofu, edamame e ovos."],
  ["Sódio sob controle", "Shoyu e missô são ricos em sódio: 1 colher de chá de shoyu por refeição, missô dissolvido fora da fervura, sem sal extra."],
  ["Hara hachi bu", "Comer até sentir-se cerca de 80% satisfeito — atenção aos sinais de saciedade."],
  ["Menos ultraprocessados e açúcar", "Temperos naturais (gengibre, cebolinha, limão, gergelim) no lugar de molhos industrializados adoçados."],
];

const ADAPTACOES = [
  ["Daikon", "Nabo comum ou rabanete"],
  ["Cavalinha (saba)", "Sardinha fresca — mais barata e rica em ômega-3"],
  ["Dashi de bonito", "Caldo caseiro de shiitake seco e/ou alga kombu; ou só água + missô"],
  ["Kabocha", "Abóbora cabotiá (é a mesma!)"],
  ["Shoyu comum", "Shoyu reduzido em sódio ou tamari sem glúten"],
  ["Peixe cru", "O plano usa peixes cozidos/grelhados — mais seguro e acessível"],
];

export default async function Desafio() {
  const { supabase, user } = await requireUser();
  const plano = await planoAtivo(supabase, user.id);
  const ativo = plano?.desafio === "japones-31";
  const hoje = hojeSP();
  const ano = hoje.slice(0, 4);
  const sugerido = hoje <= `${ano}-10-01` ? `${ano}-10-01` : hoje;

  if (!ativo || !plano)
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader titulo="Desafio 31 dias — Alimentação Japonesa" subtitulo="Projeto especial de outubro" />
        <Card className="bg-accent-soft">
          <p className="text-sm">
            Use princípios e preparações da culinária japonesa para <strong>reduzir ultraprocessados, açúcar, excesso de gordura e carne vermelha</strong>, mantendo adequação nutricional e adaptando ingredientes à realidade brasileira. O cardápio de 31 dias respeita suas metas, alergias, restrições e orçamento.
          </p>
          <IniciarDesafio inicio={sugerido} />
        </Card>
        <Principios />
      </div>
    );

  const refs = await refeicoesDoPlano(supabase, plano.id);
  const dias = agruparPorDia(refs);
  const { data: prog } = await supabase.from("challenge_progress").select("dia,concluido").eq("user_id", user.id).eq("desafio", "japones-31");
  const feitos = new Set((prog ?? []).filter((p) => p.concluido).map((p) => p.dia));
  const m = macrosItens(refs.flatMap((r) => r.itens));
  const semanas = Array.from({ length: Math.ceil(dias.length / 7) }, (_, i) => dias.slice(i * 7, i * 7 + 7));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader titulo="Desafio 31 dias — Alimentação Japonesa" subtitulo={`${dias[0]?.data.split("-").reverse().join("/")} a ${dias[dias.length - 1]?.data.split("-").reverse().join("/")}`} />
      <Card>
        <div className="mb-2 flex justify-between text-sm font-semibold">
          <span>Progresso</span>
          <span className="tabular">{feitos.size}/31 dias</span>
        </div>
        <Progress valor={feitos.size} max={31} />
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat rotulo="Custo estimado total" valor={brl(m.custo)} sub={`${brl(m.custo / dias.length)}/dia`} />
          <Stat rotulo="Sódio médio" valor={`${Math.round(m.na / dias.length)} mg`} sub="meta < 2.000 mg/dia" />
          <Stat rotulo="Receitas diferentes" valor={new Set(refs.map((r) => r.receitaId)).size} />
          <Stat rotulo="Fibras médias" valor={`${Math.round(m.f / dias.length)} g/dia`} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href="/compras" className="rounded-2xl bg-brand-soft px-3 py-2 font-semibold text-brand-strong">Lista de compras semanal</Link>
          <Link href="/preparo" className="rounded-2xl bg-brand-soft px-3 py-2 font-semibold text-brand-strong">Preparação antecipada</Link>
          <Link href="/receitas?modo=japonesa" className="rounded-2xl bg-brand-soft px-3 py-2 font-semibold text-brand-strong">Receitas japonesas</Link>
        </div>
      </Card>
      {semanas.map((sem, i) => {
        const ms = macrosItens(sem.flatMap((d) => d.refeicoes.flatMap((r) => r.itens)));
        return (
          <section key={i}>
            <h2 className="mb-2 flex items-baseline justify-between font-bold">
              Semana {i + 1} <span className="text-sm font-normal text-muted">≈ {brl(ms.custo)}</span>
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sem.map((d) => {
                const n = dias.indexOf(d) + 1;
                const principais = d.refeicoes.filter((r) => r.tipo === "almoco" || r.tipo === "jantar");
                return (
                  <li key={d.data} className={`rounded-3xl border bg-surface p-4 ${d.data === hoje ? "border-brand" : "border-line"}`}>
                    <div className="flex items-center justify-between">
                      <Link href={`/plano?dia=${d.data}`} className="font-bold hover:text-brand">Dia {n} <span className="text-xs font-normal text-muted">{d.data.split("-").reverse().slice(0, 2).join("/")}</span></Link>
                      <DiaCheck dia={n} feito={feitos.has(n)} />
                    </div>
                    <ul className="mt-2 space-y-1 text-sm">
                      {(principais.length ? principais : d.refeicoes).map((r) => (
                        <li key={r.id} className="truncate text-muted">
                          <span className="font-medium text-ink">{r.nome}:</span> {RECIPE_MAP[r.receitaId ?? ""]?.ilustracao} {RECIPE_MAP[r.receitaId ?? ""]?.nome ?? "—"}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <Principios />
      <Card>
        <h2 className="font-bold">Recriar o cardápio do desafio</h2>
        <p className="text-sm text-muted">Gera novos 31 dias com seu perfil atual. O cardápio atual fica no histórico.</p>
        <IniciarDesafio inicio={dias[0]?.data ?? sugerido} />
      </Card>
    </div>
  );
}

function Principios() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <h2 className="font-bold">Princípios do desafio</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {PRINCIPIOS.map(([t, d]) => (
            <li key={t}><strong>{t}.</strong> <span className="text-muted">{d}</span></li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="font-bold">Adaptações à realidade brasileira</h2>
        <ul className="mt-2 divide-y divide-line text-sm">
          {ADAPTACOES.map(([a, b]) => (
            <li key={a} className="flex justify-between gap-3 py-2"><span className="font-medium">{a}</span><span className="text-right text-muted">{b}</span></li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Avaliamos sódio, molhos, industrializados, porções, proteínas e fibras em cada dia. O padrão alimentar japonês está associado a desfechos favoráveis em estudos observacionais — associação não é prova de causa.</p>
      </Card>
    </div>
  );
}
